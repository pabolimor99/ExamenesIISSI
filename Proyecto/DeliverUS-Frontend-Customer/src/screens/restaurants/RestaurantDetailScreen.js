/* eslint-disable react/prop-types */
import React, { useEffect, useState, useContext } from 'react'
import { AuthorizationContext } from '../../context/AuthorizationContext'
import { StyleSheet, View, FlatList, ImageBackground, Image, Pressable } from 'react-native'
import { showMessage } from 'react-native-flash-message'
import { getDetail } from '../../api/RestaurantEndpoints'
import { create } from '../../api/OrderEndpoints'
import ImageCard from '../../components/ImageCard'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import QuantitySelector from '../../components/QuantitySelector'
import * as GlobalStyles from '../../styles/GlobalStyles'
import defaultProductImage from '../../../assets/product.jpeg'
import EditConfirmModal from '../../components/EditConfirmModal'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { OrderContext } from '../../context/OrderContext'

export default function RestaurantDetailScreen ({ navigation, route }) {
  const { loggedInUser } = useContext(AuthorizationContext)
  const [restaurant, setRestaurant] = useState({})
  const [products, setProducts] = useState([])
  const [quantities, setQuantities] = useState({})
  const [modalVisible, setModalVisible] = useState(false)
  const [tempAddress, setTempAddress] = useState('')
  const [filteredProducts, setFilteredProducts] = useState([])
  const { setOrdersUpdated } = useContext(OrderContext)

  useEffect(() => {
    fetchRestaurantDetail()
  }, [route.params.id])

  const fetchRestaurantDetail = async () => {
    try {
      const fetchedRestaurant = await getDetail(route.params.id)
      setRestaurant(fetchedRestaurant)
      setProducts(fetchedRestaurant.products)
      const initialQuantities = {}
      fetchedRestaurant.products.forEach(product => {
        initialQuantities[product.id] = 0
      })
      setQuantities(initialQuantities)
    } catch (error) {
      showMessage({
        message: `Error fetching data: ${error}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const handleQuantityChange = (productId, newQuantity) => {
    setQuantities(prev => ({ ...prev, [productId]: newQuantity }))
  }

  const handleSubmit = () => {
    const tempFilteredProducts = products.filter(product => quantities[product.id] > 0)

    if (tempFilteredProducts.length > 0) {
      setFilteredProducts(tempFilteredProducts)
      if (loggedInUser) {
        setTempAddress(loggedInUser.address || '')
        setModalVisible(true)
      } else {
        showMessage({
          message: 'If you want to place an order you must be logged in',
          type: 'danger',
          style: GlobalStyles.flashStyle,
          titleStyle: GlobalStyles.flashTextStyle
        })
        navigation.navigate('Profile')
      }
    } else {
      showMessage({
        message: 'At least one product must be selected',
        type: 'danger',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const handleConfirm = async () => {
    const productsToCreate = products
      .map(product => ({
        productId: product.id,
        quantity: quantities[product.id] || 0
      }))
      .filter(product => product.quantity > 0)

    const newOrder = {
      address: tempAddress,
      restaurantId: route.params.id,
      products: productsToCreate
    }

    try {
      await create(newOrder)
      showMessage({
        message: 'Order created successfully!',
        type: 'success',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
      setOrdersUpdated(true)
      setModalVisible(false)
      navigation.navigate('RestaurantsScreen') // Navegar a la pantalla de restaurantes
      navigation.navigate('My Orders', { dirty: true })
    } catch (error) {
      showMessage({
        message: `Error creating order: ${error}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const handleCancel = () => {
    setModalVisible(false)
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
          quantity={quantities[item.id] || 0}
          onQuantityChange={(newQuantity) => handleQuantityChange(item.id, newQuantity)}
        />
      )}
      {!item.availability && <TextRegular textStyle={styles.notAvailability}>Not available</TextRegular>}
    </ImageCard>
  )

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        <ImageBackground source={restaurant.heroImage ? { uri: process.env.API_BASE_URL + '/' + restaurant.heroImage } : undefined} style={styles.imageBackground}>
          <View style={styles.restaurantHeader}>
            <TextSemiBold textStyle={styles.textTitle}>{restaurant.name}</TextSemiBold>
            <Image style={styles.image} source={restaurant.logo ? { uri: process.env.API_BASE_URL + '/' + restaurant.logo } : undefined} />
            <TextRegular textStyle={styles.description}>{restaurant.description}</TextRegular>
            <TextRegular textStyle={styles.description}>{restaurant.restaurantCategory ? restaurant.restaurantCategory.name : ''}</TextRegular>
          </View>
        </ImageBackground>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={renderHeader}
        data={products}
        renderItem={renderProduct}
        keyExtractor={item => item.id.toString()}
      />
      <Pressable style={styles.button} onPress={handleSubmit}>
        <View style={[{ flexDirection: 'row', justifyContent: 'center' }]}>
          <MaterialCommunityIcons name='plus-circle' color={'white'} size={20} />
          <TextRegular textStyle={styles.text}>Confirm order</TextRegular>
        </View>
      </Pressable>
      <EditConfirmModal
        isVisible={modalVisible}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        data={filteredProducts}
        quantities={quantities}
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
  headerContainer: {
    flex: 1,
    marginBottom: 20
  },
  imageBackground: {
    flex: 1,
    resizeMode: 'cover',
    justifyContent: 'center'
  },
  restaurantHeader: {
    height: 250,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center'
  },
  image: {
    height: 100,
    width: 100,
    margin: 10
  },
  description: {
    color: 'white'
  },
  textTitle: {
    fontSize: 20,
    color: 'white'
  },
  button: {
    borderRadius: 10,
    padding: 10,
    margin: 10,
    width: '90%',
    backgroundColor: GlobalStyles.brandPrimary,
    alignSelf: 'center',
    alignItems: 'center'
  },
  text: {
    fontSize: 16,
    color: 'white',
    alignSelf: 'center',
    marginLeft: 5
  },
  notAvailability: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'red',
    alignSelf: 'center'
  }
})
