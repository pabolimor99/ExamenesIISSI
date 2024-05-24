import { Product, Order } from '../../models/models.js'
import { check } from 'express-validator'

// AUXILIARY METHODS

// CREATE & UPDATE
// Comprueba que los productos solicitados estén disponibles
const checkProductsAvailable = async (value, { req }) => { // Value no se usa, pero es un parametro necesario para express-validator
  try {
    if (req.body.products === undefined) {
      return Promise.reject(new Error('Order has no products.')) // Comprueba que el pedido tenga productos
    }
    for (const product of req.body.products) {
      const productDB = await Product.findByPk(product.productId)
      if (productDB === null) {
        return Promise.reject(new Error('The product does not exist.')) // Comprueba que cada uno de los productos existan en la BD
      } else {
        if (productDB.availability === false) {
          return Promise.reject(new Error('The product is not available.')) // Comprueba el campo 'availability'
        }
      }
    }
    return Promise.resolve()
  } catch (err) {
    console.log(err)
    return Promise.reject(new Error(err))
  }
}
// CREATE
// Comprueba que todos los productos solicitados pertenezcan al mismo restaurante
const checkAllProductsFromSameRestaurant = async (value, { req }) => {
  try {
    if (req.body.products === undefined) {
      return Promise.reject(new Error('Order has no products.')) // Comprueba que el pedido tenga productos
    }
    const restaurant = req.body.restaurantId
    for (const product of req.body.products) {
      const productDB = await Product.findByPk(product.productId)
      if (restaurant !== productDB.restaurantId) {
        return Promise.reject(new Error('The product does not belong to the restaurant.')) // Comprueba que los productos pertenezcan al restaurante de la petición
      }
    }
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(err))
  }
}

// UPDATE
// Comprueba que productos nuevos pertenezcan al restaurante
// Debemos encontrar la order original y extraer el id de su restaurante
const checkAllProductsFromOriginalRestaurant = async (value, { req }) => {
  try {
    if (req.body.products === undefined) {
      return Promise.reject(new Error('Order has no products.')) // Comprueba que el pedido tenga productos
    }

    const originalOrder = await Order.findByPk(req.params.orderId) // Extrae el order de la BD

    if (originalOrder === null) {
      return Promise.reject(new Error('The order does not exist')) // Comprueba que ese order exista en la BD
    }

    const restaurantId = originalOrder.restaurantId // ID del restaurante original

    for (const product of req.body.products) {
      const productDB = await Product.findByPk(product.productId) // Extrae cada nuevo producto de la BD
      if (productDB == null) {
        return Promise.reject(new Error('The product does not exist.')) // Comprueba que exista
      } else {
        if (restaurantId !== productDB.restaurantId) {
          return Promise.reject(new Error('There are products from different restaurants.')) // Comprueba que el nuevo producto pertenezca al restaurante original
        }
      }
    }
    return Promise.resolve()
  } catch (err) {
    return Promise.reject(new Error(err))
  }
}

// 1. Check that restaurantId is present in the body and corresponds to an existing restaurant
// 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
// 3. Check that products are available
// 4. Check that all the products belong to the same restaurant
const create = [
  check('restaurantId').exists().isInt({ min: 1 }).toInt(), // #1. La comprobacion del restaurante en BD ya se realiza en middleware
  check('products').exists().isArray().isLength({ min: 1 }),
  check('products.*.productId').exists().isInt({ min: 1 }),
  check('products.*.quantity').exists().isInt({ min: 1 }), // #2
  check('products').custom(checkProductsAvailable), // #3
  check('products').custom(checkAllProductsFromSameRestaurant), // #4
  check('address').exists() // Test "Should return 422 when invalid order data" en orders.tests
  // Comprueba que 'address' este presente en el error
]

// TODO: Include validation rules for update that should:
// 1. Check that restaurantId is NOT present in the body.
// 2. Check that products is a non-empty array composed of objects with productId and quantity greater than 0
// 3. Check that products are available
// 4. Check that all the products belong to the same restaurant of the originally saved order that is being edited.
// 5. Check that the order is in the 'pending' state.
const update = [
  check('restaurantId').not().exists(), // #1
  check('products').exists().isArray().isLength({ min: 1 }),
  check('products.*.productId').exists().isInt({ min: 1 }),
  check('products.*.quantity').exists().isInt({ min: 1 }), // #2
  check('products').custom(checkProductsAvailable), // #3
  check('products').custom(checkAllProductsFromOriginalRestaurant), // #4

  // #5 Ya se comprueba en middleware (?)

  check('address').exists() // Test "Should return 422 when invalid order data" en orders.tests
  // Comprueba que 'address' este presente en el error
]

export { create, update }
