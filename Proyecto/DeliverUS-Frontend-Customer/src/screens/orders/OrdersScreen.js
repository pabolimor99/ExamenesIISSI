import React, { useContext, useState, useEffect } from 'react'
import { StyleSheet, View, Pressable, FlatList } from 'react-native'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import { AuthorizationContext } from '../../context/AuthorizationContext'
import { getAll, remove } from '../../api/OrderEndpoints'
import * as GlobalStyles from '../../styles/GlobalStyles'
import { showMessage } from 'react-native-flash-message'
import ImageCard from '../../components/ImageCard'
import restaurantLogo from '../../../assets/restaurantLogo.jpeg'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import DeleteModal from '../../components/DeleteModal'
import { OrderContext } from '../../context/OrderContext'

export default function OrdersScreen ({ navigation, route }) {
  const { ordersUpdated, setOrdersUpdated } = useContext(OrderContext)

  // State para manejar el array de pedidos
  const [orders, setOrders] = useState([])

  // Contexto para obtener información del usuario logueado
  const { loggedInUser } = useContext(AuthorizationContext)

  // State para manejar el borrado de pedidos cuyo estado sea 'pending', si el cliente lo desea
  const [orderToBeDeleted, setOrderToBeDeleted] = useState(null)

  // Definimos fetchOrders como una función asíncrona dentro del componente -> Obtiene los pedidos del cliente.
  const fetchOrders = async () => {
    try {
    // Solicitamos todos los pedidos del cliente
      const fetchedOrders = await getAll()

      // Ordenamos los pedidos de más reciente a más antiguo. Si createdAt es un objeto Date, no es necesario new Date()
      fetchedOrders.sort((a, b) => b.createdAt - a.createdAt)

      // Actualizamos el estado con los pedidos ordenados
      setOrders(fetchedOrders)
      setOrdersUpdated(false)
    } catch (error) {
    // Mostramos un mensaje si hay un error al recuperar los pedidos
      showMessage({
        message: `There was an error while retrieving orders. ${error}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  // useEffect para invocar fetchOrders cuando el componente se monta o cuando loggedInUser cambie
  useEffect(() => {
  // Comprobamos si hay un usuario logueado antes de intentar recuperar los pedidos
    if (loggedInUser) {
      fetchOrders()
    } else {
    // Si no hay un usuario logueado, limpiamos el estado de los pedidos
      setOrders(null)
    }
  }, [loggedInUser, route, ordersUpdated]) // Agregamos loggedInUser como dependencia para que el efecto se ejecute cuando cambie

  // Renderizado de CADA pedido (cada pedido es un item de una FlatList)
  const renderOrder = ({ item }) => {
    return (

    // Cada pedido va a ser un componente ImageCard

      <ImageCard
        imageUri={item.restaurant.logo ? { uri: process.env.API_BASE_URL + '/' + item.restaurant.logo } : restaurantLogo}
        title={item.restaurant.name}
        onPress={() => {
          navigation.navigate('OrderDetailScreen', { id: item.id })
        }}
      >
        <TextRegular>Status: <TextSemiBold textStyle={item.status === 'in process' ? { color: GlobalStyles.brandPrimary } : item.status === 'sent' ? { color: GlobalStyles.brandGreen } : item.status === 'delivered' ? { color: 'purple' } : { color: GlobalStyles.brandSecondary }}>{item.status}</TextSemiBold></TextRegular>
        <TextRegular>Price: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>{item.price}€</TextSemiBold></TextRegular>
        <TextRegular>Order placed on: <TextSemiBold>{item.createdAt}</TextSemiBold></TextRegular>

        {/* El botón de editar y borrar solo se muestra si el status del pedido es 'pending'. Es decir: */}

        {item.status === 'pending' &&
        <View style={styles.actionButtonsContainer}>

          {/* Botón de Editar */}

          <Pressable
            onPress={() => navigation.navigate('EditOrderScreen', { orderId: item.id, id: item.restaurant.id })
            }
            style={({ pressed }) => [
              {
                backgroundColor: pressed
                  ? GlobalStyles.brandBlueTap
                  : GlobalStyles.brandBlue
              },
              styles.actionButton
            ]}>
            <View style={[{ flex: 1, flexDirection: 'row', justifyContent: 'center' }]}>
              <MaterialCommunityIcons name='pencil' color={'white'} size={20}/>
              <TextRegular textStyle={styles.text}>
                Edit
              </TextRegular>
            </View>
          </Pressable>

          {/* Botón de Borrar */}

          <Pressable
              onPress={() => { setOrderToBeDeleted(item) }}
              style={({ pressed }) => [
                {
                  backgroundColor: pressed
                    ? GlobalStyles.brandPrimaryTap
                    : GlobalStyles.brandPrimary
                },
                styles.actionButton
              ]}>
            <View style={[{ flex: 1, flexDirection: 'row', justifyContent: 'center' }]}>
              <MaterialCommunityIcons name='delete' color={'white'} size={20}/>
              <TextRegular textStyle={styles.text}>
                Delete
              </TextRegular>
            </View>
          </Pressable>
        </View>}
      </ImageCard>
    )
  }

  // En caso de que el usuario no esté logueado
  const renderEmptyOrdersList = () => {
    return (
      <TextRegular textStyle={styles.emptyList}>
        No orders were retreived. Are you logged in?
      </TextRegular>
    )
  }

  // Para el borrado de un pedido
  const removeOrder = async (order) => {
    try {
      await remove(order.id)
      // await fetchOrders() En lugar de llamar a fetchOrders, actualizar el estado:
      setOrders(prevOrders => prevOrders.filter(o => o.id !== order.id))
      setOrderToBeDeleted(null)
      setOrdersUpdated(true) // Actualizar ordersUpdated en OrderContext
      showMessage({
        message: 'Order succesfully removed',
        type: 'success',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    } catch (error) {
      console.log(error)
      setOrderToBeDeleted(null)
      showMessage({
        message: `Order ${order.name} could not be removed.`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  // Retornamos la lista de pedidos junto con el modal que confirma o cancela el borrado en caso de que el cliente trate de borrar un pedido
  return (
    <>
      <FlatList
        style={styles.container}
        data={orders}
        renderItem={renderOrder}
        keyExtractor={item => item.id.toString()}
        ListEmptyComponent={renderEmptyOrdersList}
      />
      <DeleteModal
        isVisible={orderToBeDeleted !== null}
        onCancel={() => setOrderToBeDeleted(null)}
        onConfirm={() => removeOrder(orderToBeDeleted)}>
          <TextRegular>The products of this order will be deleted as well</TextRegular>
      </DeleteModal>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  button: {
    borderRadius: 8,
    height: 40,
    marginTop: 12,
    padding: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    width: '80%'
  },
  actionButton: {
    borderRadius: 8,
    height: 40,
    marginTop: 12,
    margin: '1%',
    padding: 10,
    alignSelf: 'center',
    flexDirection: 'column',
    width: '50%'
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    bottom: 5,
    position: 'relative',
    width: '90%'
  },
  text: {
    fontSize: 16,
    color: 'white',
    alignSelf: 'center',
    marginLeft: 5
  },
  emptyList: {
    textAlign: 'center',
    padding: 50
  }
})
