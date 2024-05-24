/* eslint-disable react/prop-types */
import React, { useContext, useState, useEffect } from 'react'
import { View, FlatList, Pressable, StyleSheet } from 'react-native'
import { getOrderDetail, update } from '../../api/OrderEndpoints'
import { getDetail } from '../../api/RestaurantEndpoints'
import ImageCard from '../../components/ImageCard'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import QuantitySelector from '../../components/QuantitySelector'
import { showMessage } from 'react-native-flash-message'
import defaultProductImage from '../../../assets/product.jpeg'
import * as GlobalStyles from '../../styles/GlobalStyles'
import EditConfirmModal from '../../components/EditConfirmModal'
import { OrderContext } from '../../context/OrderContext'

export default function EditOrderScreen ({ navigation, route }) {
  const [restaurant, setRestaurant] = useState({})
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [orderDetails, setOrderDetails] = useState({})
  // Agregar estado para manejar la visibilidad del modal y la dirección temporal
  const [modalVisible, setModalVisible] = useState(false)
  const [tempAddress, setTempAddress] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])

  const { setOrdersUpdated } = useContext(OrderContext)

  useEffect(() => {
    fetchData()
  }, [route.params.id, route.params.orderId])

  const fetchData = async () => {
    try {
      const restaurantData = await getDetail(route.params.id) // Obtenemos los detalles del restaurante (productos y categoría)
      const orderData = await getOrderDetail(route.params.orderId) // Obtenemos el pedido inicial del cliente
      setRestaurant(restaurantData) // Actualizamos el estado para guardar el resturante (necesario para renderizado de header)
      setProducts(restaurantData.products) // Actualizamos el estado para guardar los productos del restaurante
      setOrderDetails(orderData) // Acutalizamos el estado para almacenar el pedido inicial del cliente
      setTempAddress(orderData.address)
      // Almacenamos el estado de las cantidades de los pedidos iniciales (se sacan de OrderProducts)
      const initialQuantities = {}
      orderData.products.forEach(p => { initialQuantities[p.id] = p.OrderProducts.quantity }) // metemos en la lista el id del producto (clave) y su cantidad pedida inicialmente (valor)
      setQuantities(initialQuantities)
    } catch (error) {
      showMessage({
        message: `Error fetching data: ${error}`,
        type: 'error'
      })
    }
  }

  // Actualiza la cantidad de producto en el estado que maneja las cantidades por producto (quantities) al pulsar el botón "+" o "-"
  const handleQuantityChange = (productId, newQuantity) => {
    setQuantities(prev => ({ ...prev, [productId]: newQuantity }))
  }

  // Actualiza la cantidad de producto en el estado que maneja las cantidades por producto (quantities) al pulsar el botón "+" o "-"
  const handleSubmit = () => {
    // Inicialmente, asumimos que no hay cambios.
    let hasChanges = false

    // Nos quedamos con los productos involucrados en el pedido, es decir, aquellos que finalmente tengan cantidad > 0.
    const tempFilteredProducts = products.filter(product => quantities[product.id] > 0)

    // Verificamos si hay cambios en las cantidades con respecto a las cantidades iniciales.
    for (const product of tempFilteredProducts) {
      const initialQuantity = orderDetails.products.find(p => p.id === product.id)?.OrderProducts.quantity || 0
      if (quantities[product.id] !== initialQuantity) {
        hasChanges = true // Confirmamos que hay cambios si alguna cantidad no coincide con su inicial.
      }
    }

    // Además, verificamos si alguna cantidad ha sido reducida a cero desde un valor inicial positivo.
    for (const product of orderDetails.products) {
      if (product.OrderProducts.quantity > 0 && (!quantities[product.id] || quantities[product.id] === 0)) {
        hasChanges = true // Confirmamos que hay cambios si alguna cantidad inicial ha sido reducida a cero.
      }
    }

    if (hasChanges) {
      setFilteredProducts(tempFilteredProducts) // Guardamos solo los productos modificados con cantidad > 0
      setModalVisible(true) // Mostramos el modal
    } else {
      // Si no hay cambios, mostramos un mensaje indicativo.
      showMessage({
        message: 'No changes have been made to the order.',
        type: 'info',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle,
        backgroundColor: 'grey'
      })
    }
  }

  const renderProduct = ({ item }) => (
    <ImageCard
      imageUri={item.image ? { uri: process.env.API_BASE_URL + '/' + item.image } : defaultProductImage}
      title={item.name}
    >
      <TextRegular>{item.description}</TextRegular>
      <TextSemiBold>{item.price} €</TextSemiBold>
      {item.availability && (
        <QuantitySelector
          quantity={quantities[item.id] || 0} // Pasamos la cantidad inicial de producto o 0 si es un producto que no estaba inicialmente en el pedido
          onQuantityChange={(newQuantity) => handleQuantityChange(item.id, newQuantity)} // Si se pulsa algún botón, se va a actualizar el estado de las cantidades
        />
      )}
      {!item.availability &&
        <TextRegular textStyle={styles.notAvailability}>Not available</TextRegular>
      }
    </ImageCard>
  )

  // En caso de pulsar el botón de confirmar dentro del modal EditConfirmModal
  const handleConfirm = async () => {
  // Construimos el array de productos que vamos a enviar
    const productsToUpdate = products
      .map(product => ({
        productId: product.id,
        quantity: quantities[product.id] || 0
      }))
      .filter(product => product.quantity > 0) // Solo incluimos los productos con cantidad > 0

    // Creamos el objeto de pedido actualizado solo con la dirección nueva y los productos a actualizar
    const updatedOrder = {
      address: tempAddress,
      products: productsToUpdate
    }

    // Intentamos actualizar el pedido
    try {
      await update(route.params.orderId, updatedOrder)
      showMessage({
        message: 'Order updated successfully!',
        type: 'success'
      })
      setOrdersUpdated(true) // Actualizar ordersUpdated en OrderContext
      setModalVisible(false) // Cerrar el modal tras confirmar
      navigation.navigate('OrdersScreen', { dirty: false }) // Volvemos a la pantalla anterior
    } catch (error) { // Capturamos si hay error
      showMessage({
        message: `Error updating order: ${error}`,
        type: 'error'
      })
    }
  }

  // En caso de quererer cancelar el pedido modificado
  const handleCancel = () => {
    setModalVisible(false) // Simplemente cerrar el modal
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id.toString()}
      />
      <Pressable style={styles.button} onPress={handleSubmit}>
        <TextRegular textStyle={styles.text}>Confirm Changes</TextRegular>
      </Pressable>
      <EditConfirmModal
        isVisible={modalVisible} // el modal se pone en visible si el handleSubmit lo permite
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        data={filteredProducts} // los datos pasados al modal son los productos filtrados (cuya cantidad > 0)
        quantities={quantities} // Pasamos el diccionario con id:cantidad
        shippingCosts={restaurant.shippingCosts || 0}
        addr={tempAddress}
        setAddr={setTempAddress}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 20
  },
  button: {
    borderRadius: 10,
    padding: 10,
    margin: 10, // Para dejar margen con la barra de navegación inferior
    width: '90%',
    backgroundColor: GlobalStyles.brandPrimary,
    alignSelf: 'center', // Centramos el botón (el rectángulo rojo)
    alignItems: 'center' // Centramos sus elementos (el contenido del botón)
  },
  text: {
    fontSize: 16,
    color: 'white',
    alignSelf: 'center',
    marginLeft: 5
  },
  notAvailability: {
    fontSize: 20,
    fontStyle: 'bold',
    color: 'red',
    alignSelf: 'center'
  }
})
