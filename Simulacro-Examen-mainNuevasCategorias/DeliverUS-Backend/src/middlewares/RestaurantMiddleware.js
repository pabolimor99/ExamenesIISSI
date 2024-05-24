import { Restaurant, Order, RestaurantCategory } from '../models/models.js'

const checkRestaurantOwnership = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findByPk(req.params.restaurantId)
    if (req.user.id === restaurant.userId) {
      return next()
    }
    return res.status(403).send('Not enough privileges. This entity does not belong to you')
  } catch (err) {
    return res.status(500).send(err)
  }
}
const restaurantHasNoOrders = async (req, res, next) => {
  try {
    const numberOfRestaurantOrders = await Order.count({
      where: { restaurantId: req.params.restaurantId }
    })
    if (numberOfRestaurantOrders === 0) {
      return next()
    }
    return res.status(409).send('Some orders belong to this restaurant.')
  } catch (err) {
    return res.status(500).send(err.message)
  }
}
const restaurantCategoryExist = async (req, res, next) => {
  try {
    const newCategory = await RestaurantCategory.findOne({
      where: { name: req.body.name }
    })
    if (newCategory) {
      return res.status(409).send('Esta categoria ya esta creada')
    } else {
      return next()
    }
  } catch (err) {
    return res.status(400).send(err)
  }
}

export { checkRestaurantOwnership, restaurantHasNoOrders, restaurantCategoryExist }
