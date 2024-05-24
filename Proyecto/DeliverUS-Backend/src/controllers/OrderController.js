// eslint-disable-next-line no-unused-vars
import { Order, Product, Restaurant, User, sequelizeSession } from '../models/models.js'
import moment from 'moment'
import { Op } from 'sequelize'

// Permite añadir filtros a la busqueda en la BD
const generateFilterWhereClauses = function (req) {
  const filterWhereClauses = []
  if (req.query.status) {
    switch (req.query.status) {
      case 'pending':
        filterWhereClauses.push({
          startedAt: null
        })
        break
      case 'in process':
        filterWhereClauses.push({
          [Op.and]: [
            {
              startedAt: {
                [Op.ne]: null
              }
            },
            { sentAt: null },
            { deliveredAt: null }
          ]
        })
        break
      case 'sent':
        filterWhereClauses.push({
          [Op.and]: [
            {
              sentAt: {
                [Op.ne]: null
              }
            },
            { deliveredAt: null }
          ]
        })
        break
      case 'delivered':
        filterWhereClauses.push({
          sentAt: {
            [Op.ne]: null
          }
        })
        break
    }
  }
  if (req.query.from) {
    const date = moment(req.query.from, 'YYYY-MM-DD', true)
    filterWhereClauses.push({
      createdAt: {
        [Op.gte]: date
      }
    })
  }
  if (req.query.to) {
    const date = moment(req.query.to, 'YYYY-MM-DD', true)
    filterWhereClauses.push({
      createdAt: {
        [Op.lte]: date.add(1, 'days') // FIXME: se pasa al siguiente día a las 00:00
      }
    })
  }
  return filterWhereClauses
}

// Devuelve los orders dado un restaurantId
const indexRestaurant = async function (req, res) {
  const whereClauses = generateFilterWhereClauses(req)
  whereClauses.push({
    restaurantId: req.params.restaurantId
  })
  try {
    const orders = await Order.findAll({
      where: whereClauses,
      include: {
        model: Product,
        as: 'products'
      }
    })
    res.json(orders)
  } catch (err) {
    res.status(500).send(err)
  }
}

// IndexCustomer: queries orders from current logged-in customer and send them back.
// Orders have to include products that belongs to each order and restaurant details
// sort them by createdAt date, desc.

const indexCustomer = async function (req, res) {
  try {
    // Obtenemos todos los pedidos de la BD que pertenezcan al usuario actual.
    const orders = await Order.findAll({
      where: { userId: req.user.id },
      include: [{ // Asociaciones con Product y Restaurant (como un JOIN en SQL)
        model: Product,
        as: 'products' // Alias de la asociación (permite acceder a los productos de un pedido mediante 'products')
      }, {
        model: Restaurant,
        as: 'restaurant'
      }],
      order: [['createdAt', 'DESC']] // Ordenamos los pedidos por fecha de creación en orden descendente
    })
    res.json(orders) // Devuelve JSON con los pedidos encontrados
  } catch (err) {
    res.status(500).send(err)
  }
}

//  AUXILIAR: se usará tanto en CREATE como UPDATE -> Nos permite calcular el precio de un pedido

const calculateOrderPrice = async function (products, transaction) {
  let orderPrice = 0.0
  for (const product of products) {
    const productDB = await Product.findByPk(product.productId, {
      attributes: ['price'],
      transaction
    })
    orderPrice += product.quantity * productDB.price // Acumulando el precio total
  }
  return orderPrice
}

// CREATE: receives a new order and stores it in the database.
// 1. If price is greater than 10€, shipping costs have to be 0.
// 2. If price is less or equals to 10€, shipping costs have to be restaurant default shipping costs and have to be added to the order total price
// 3. In order to save the order and related products, start a transaction, store the order, store each product linea and commit the transaction
// 4. If an exception is raised, catch it and rollback the transaction

const create = async (req, res) => {
  const t = await sequelizeSession.transaction() // Inicializa la transacción
  try {
    const newOrder = Order.build(req.body) // Construye la instancia del pedido con la información pasada en el cuerpo de la petición (todavía no se almacena en la BD)

    // Introducimos algumos parámetros de forma manual que no son indicados por el cliente al crear el pedido

    newOrder.createdAt = Date.now()
    newOrder.userId = req.user.id // Usuario que crea el pedido => usuario que realiza la petición

    // Llamada a auxiliar para el cálculo del precio

    const orderPrice = await calculateOrderPrice(req.body.products, t)

    // Calculo costes de envio

    if (orderPrice > 10) { // Si es mayor a 10, gratis
      newOrder.shippingCosts = 0.0
    } else {
      const restaurantDB = await Restaurant.findByPk(req.body.restaurantId, { transaction: t }) // Extrae restaurante de la BD
      newOrder.shippingCosts = restaurantDB.shippingCosts // Establece el coste de envio == al por defecto del restaurante
    }

    newOrder.price = orderPrice + newOrder.shippingCosts // Actualizar precio con costes de envío

    const order = await newOrder.save({ transaction: t }) // Guardamos el pedido en la base de datos

    // Añadimos los productos al pedido
    for (const newProduct of req.body.products) { // Nueva fila a la tabla OrderProducts con el pedido y los productos asociados
      const productDB = await Product.findByPk(newProduct.productId, { transaction: t })
      await order.addProduct(productDB, { // Sequelize inserta en la tabla correspondiente
        // Añadimos el producto al pedido incluyendo la cantidad y precio a la tabla intermedia (OrderProducts)
        through: { quantity: newProduct.quantity, unityPrice: productDB.price },
        transaction: t
      })
    }

    const newOrderDB = await Order.findOne( // Extrae el producto creado de la BD, junto con los productos
      {
        where: { id: order.id },
        include: {
          model: Product,
          as: 'products'
        },
        transaction: t
      }
    )

    // Espera a que se realice el commit de la transacción
    await t.commit()
    res.json(newOrderDB)
  } catch (err) {
    await t.rollback()
    res.status(500).send(err)
  }
}

// UPDATE: receives a modified order and persists it in the database.
// 1. If price is greater than 10€, shipping costs have to be 0.
// 2. If price is less or equals to 10€, shipping costs have to be restaurant default shipping costs and have to be added to the order total price
// 3. In order to save the updated order and updated products, start a transaction, update the order, remove the old related OrderProducts and store the new product lines, and commit the transaction
// 4. If an exception is raised, catch it and rollback the transaction

const update = async function (req, res) {
  const t = await sequelizeSession.transaction() // Inicializa la transacción
  try {
    // Obtenemos el pedido original
    const originalOrder = await Order.findByPk(req.params.orderId)

    // La única información que puede modificar directamente el cliente del pedido es la dirección de entrega
    const updatedOrderData = {
      address: req.body.address // Actualizamos solo la dirección de entrega
    }

    // Calculamos el precio del pedido con la nueva selección de productos
    const updatedOrderPrice = await calculateOrderPrice(req.body.products, t)

    // Calculamos los costes de envío con el nuevo precio obtenido
    if (updatedOrderPrice > 10) {
      updatedOrderData.shippingCosts = 0.0
    } else {
      const restaurantDB = await Restaurant.findByPk(originalOrder.restaurantId, { transaction: t })
      updatedOrderData.shippingCosts = restaurantDB.shippingCosts
    }

    updatedOrderData.price = updatedOrderPrice + updatedOrderData.shippingCosts // Precio total del pedido modificado

    // Actualizamos el pedido en la base de datos con los nuevos datos
    await Order.update(updatedOrderData, { where: { id: req.params.orderId }, transaction: t })

    // Obtenemos el pedido actualizado de la base de datos
    const updatedOrder = await Order.findByPk(req.params.orderId, { transaction: t })

    await updatedOrder.setProducts([], { transaction: t }) // Eliminamos los productos anteriores del pedido

    // Añadimos los nuevos productos al pedido
    for (const product of req.body.products) {
      const productDB = await Product.findByPk(product.productId, { transaction: t }) // Buscamos cada producto en la base de datos
      // Añadimos el producto al pedido incluyendo la cantidad y precio a la tabla intermedia (OrderProducts)
      await updatedOrder.addProduct(productDB, {
        through: { quantity: product.quantity, unityPrice: productDB.price },
        transaction: t
      })
    }

    // Extraemos el pedido actualizado de la DB
    const newOrderDB = await Order.findOne(
      {
        where: { id: updatedOrder.id },
        include: {
          model: Product,
          as: 'products'
        },
        transaction: t
      })

    await t.commit()
    res.json(newOrderDB)
  } catch (err) {
    await t.rollback()
    res.status(500).send(err)
  }
}

// Destroy: receives an orderId as path param and removes the associated order from the database.
// 1. The migration include the "ON DELETE CASCADE" directive so OrderProducts related to this order will be automatically removed.

const destroy = async function (req, res) {
  try {
    const deleted = await Order.destroy({ where: { id: req.params.orderId } })

    let message = '' // Inicializa mensaje
    if (deleted === 1) { // Comprueba que se haya eliminado el pedido
      message = 'Order successfully deleted.'
    } else {
      message = 'Could not delete order.'
    }
    res.json(message)
  } catch (err) {
    res.status(500).send(err)
  }
}

const confirm = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.startedAt = new Date()
    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const send = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.sentAt = new Date()
    const updatedOrder = await order.save()
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const deliver = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId)
    order.deliveredAt = new Date()
    const updatedOrder = await order.save()
    const restaurant = await Restaurant.findByPk(order.restaurantId)
    const averageServiceTime = await restaurant.getAverageServiceTime()
    await Restaurant.update({ averageServiceMinutes: averageServiceTime }, { where: { id: order.restaurantId } })
    res.json(updatedOrder)
  } catch (err) {
    res.status(500).send(err)
  }
}

const show = async function (req, res) {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      include: [{
        model: Restaurant,
        as: 'restaurant',
        attributes: ['name', 'description', 'address', 'postalCode', 'url', 'shippingCosts', 'averageServiceMinutes', 'email', 'phone', 'logo', 'heroImage', 'status', 'restaurantCategoryId']
      },
      {
        model: User,
        as: 'user',
        attributes: ['firstName', 'email', 'avatar', 'userType']
      },
      {
        model: Product,
        as: 'products'
      }]
    })
    res.json(order)
  } catch (err) {
    res.status(500).send(err)
  }
}

const analytics = async function (req, res) {
  const yesterdayZeroHours = moment().subtract(1, 'days').set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  const todayZeroHours = moment().set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
  try {
    const numYesterdayOrders = await Order.count({
      where:
      {
        createdAt: {
          [Op.lt]: todayZeroHours,
          [Op.gte]: yesterdayZeroHours
        },
        restaurantId: req.params.restaurantId
      }
    })
    const numPendingOrders = await Order.count({
      where:
      {
        startedAt: null,
        restaurantId: req.params.restaurantId
      }
    })
    const numDeliveredTodayOrders = await Order.count({
      where:
      {
        deliveredAt: { [Op.gte]: todayZeroHours },
        restaurantId: req.params.restaurantId
      }
    })

    const invoicedToday = await Order.sum(
      'price',
      {
        where:
        {
          createdAt: { [Op.gte]: todayZeroHours }, // FIXME: Created or confirmed?
          restaurantId: req.params.restaurantId
        }
      })
    res.json({
      restaurantId: req.params.restaurantId,
      numYesterdayOrders,
      numPendingOrders,
      numDeliveredTodayOrders,
      invoicedToday
    })
  } catch (err) {
    res.status(500).send(err)
  }
}

const OrderController = {
  indexRestaurant,
  indexCustomer,
  create,
  update,
  destroy,
  confirm,
  send,
  deliver,
  show,
  analytics
}
export default OrderController
