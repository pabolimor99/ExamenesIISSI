import { Order, Restaurant } from '../models/models.js'

const checkOrderCustomer = async (req, res, next) => { // Comprobar que el order pertenezca al customer que hace la query
  try {
    const order = await Order.findByPk(req.params.orderId, { // Se busca el order solicitado mediante el ID de la query
      attributes: ['userId'] // Solo nos interesa el userID
    })
    if (req.user.id === order.userId) {
      next() // Si coincide, se pasa el middleware
    } else {
      return res.status(403).send('Not enough privileges. This entity does not belong to you') // Si no -> lanza 403
    }
  } catch (error) {
    return res.status(500).send(error)
  }
}

const checkRestaurantExists = async (req, res, next) => { // Comprobar que el restaurante exista en la BD
  try {
    const restaurante = await Restaurant.findByPk(req.body.restaurantId) // Busqueda del restaurante usando el ID del body
    if (restaurante === null) {
      return res.status(409).send('The restaurant of the order does not exist.') // Si no se ha encontrado -> lanza 409
    } else { next() }
  } catch (error) {
    return res.status(500).send(error)
  }
}

const checkOrderOwnership = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId, {
      include: {
        model: Restaurant,
        as: 'restaurant'
      }
    })
    if (req.user.id === order.restaurant.userId) {
      return next()
    } else {
      return res.status(403).send('Not enough privileges. This entity does not belong to you')
    }
  } catch (err) {
    return res.status(500).send(err)
  }
}

const checkOrderVisible = (req, res, next) => {
  if (req.user.userType === 'owner') {
    checkOrderOwnership(req, res, next)
  } else if (req.user.userType === 'customer') {
    checkOrderCustomer(req, res, next)
  }
}

const checkOrderIsPending = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId)
    const status = order.status
    if (status === 'pending') {
      return next()
    } else {
      return res.status(409).send('The order has already been started')
    }
  } catch (err) {
    return res.status(500).send(err.message)
  }
}

const checkOrderCanBeSent = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId)
    const isShippable = order.startedAt && !order.sentAt
    if (isShippable) {
      return next()
    } else {
      return res.status(409).send('The order cannot be sent')
    }
  } catch (err) {
    return res.status(500).send(err.message)
  }
}
const checkOrderCanBeDelivered = async (req, res, next) => {
  try {
    const order = await Order.findByPk(req.params.orderId)
    const isDeliverable = order.startedAt && order.sentAt && !order.deliveredAt
    if (isDeliverable) {
      return next()
    } else {
      return res.status(409).send('The order cannot be delivered')
    }
  } catch (err) {
    return res.status(500).send(err.message)
  }
}

export { checkOrderOwnership, checkOrderCustomer, checkOrderVisible, checkOrderIsPending, checkOrderCanBeSent, checkOrderCanBeDelivered, checkRestaurantExists }
