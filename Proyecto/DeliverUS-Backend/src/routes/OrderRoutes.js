import OrderController from '../controllers/OrderController.js'
import { hasRole, isLoggedIn } from '../middlewares/AuthMiddleware.js'
import { checkEntityExists } from '../middlewares/EntityMiddleware.js'
import * as OrderMiddleware from '../middlewares/OrderMiddleware.js'
import * as OrderValidation from '../controllers/validation/OrderValidation.js'
import { handleValidation } from '../middlewares/ValidationHandlingMiddleware.js'
import { Order } from '../models/models.js'

const loadFileRoutes = function (app) {
  // 1. Retrieving orders from current logged-in customer
  // 2. Creating a new order (only customers can create new orders)

  app.route('/orders')
    // 1.
    .get(
      isLoggedIn, // Verificar usuario logado
      hasRole('customer'), // Verificar que usuario sea customer
      OrderController.indexCustomer // Finalmente, se llama al controlador
    )
    // 2.
    .post(
      isLoggedIn, // Verificar usuario logado
      hasRole('customer'), // Verificar que usuario sea customer
      OrderMiddleware.checkRestaurantExists, // Usamos el middleware para comprobar que el ID del restaurante este en la BD
      OrderValidation.create,
      handleValidation, // Pasamos las validaciones del create
      OrderController.create // Llamada al controlador
    )

  app.route('/orders/:orderId/confirm')
    .patch(
      isLoggedIn,
      hasRole('owner'),
      checkEntityExists(Order, 'orderId'),
      OrderMiddleware.checkOrderOwnership,
      OrderMiddleware.checkOrderIsPending,
      OrderController.confirm)

  app.route('/orders/:orderId/send')
    .patch(
      isLoggedIn,
      hasRole('owner'),
      checkEntityExists(Order, 'orderId'),
      OrderMiddleware.checkOrderOwnership,
      OrderMiddleware.checkOrderCanBeSent,
      OrderController.send)

  app.route('/orders/:orderId/deliver')
    .patch(
      isLoggedIn,
      hasRole('owner'),
      checkEntityExists(Order, 'orderId'),
      OrderMiddleware.checkOrderOwnership,
      OrderMiddleware.checkOrderCanBeDelivered,
      OrderController.deliver)

  // 3. Editing order (only customers can edit their own orders)
  // 4. Remove order (only customers can remove their own orders)
  app.route('/orders/:orderId')
    .get(
      isLoggedIn, // Verificar usuario logado
      checkEntityExists(Order, 'orderId'), // Verificar que el order exista en la BD
      OrderMiddleware.checkOrderVisible, // Checkea usuario que realiza la peticion. Si owner -> ¿es el owner del restaurante?
      //  Si customer -> ¿customer que hizo el order?
      OrderController.show)
    .put(
      isLoggedIn, // Verificar usuario logado
      hasRole('customer'), // Verificar que usuario sea customer
      checkEntityExists(Order, 'orderId'), // Verificar que el order exista en la BD
      OrderMiddleware.checkOrderCustomer, // Comprobar que el pedido pertenezca al usuario logado
      OrderMiddleware.checkOrderIsPending, // Comprobar que el order tenga status 'pending', o no será modificable
      OrderValidation.update,
      handleValidation, // Hacemos las validaciones
      OrderController.update // Llamada al controller
    )
    .delete(
      isLoggedIn, // Verificar usuario logado
      hasRole('customer'), // Verificar que usuario sea customer
      checkEntityExists(Order, 'orderId'), // Verificar que el order exista en la BD
      OrderMiddleware.checkOrderCustomer, // Comprobar que el pedido pertenezca al usuario logado
      OrderMiddleware.checkOrderIsPending,
      handleValidation, // Hacemos las validaciones
      OrderController.destroy // Llamada al controller
    )
}

export default loadFileRoutes
