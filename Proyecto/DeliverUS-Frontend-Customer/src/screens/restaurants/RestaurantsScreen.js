/* eslint-disable react/prop-types */
import React, { useEffect, useState, useContext } from 'react'
import { StyleSheet, FlatList } from 'react-native'
import TextSemiBold from '../../components/TextSemibold'
import TextRegular from '../../components/TextRegular'
import * as GlobalStyles from '../../styles/GlobalStyles'
import { getAllRestaurantsClient } from '../../api/RestaurantEndpoints'
import { getPopular } from '../../api/ProductEndpoints'
import { showMessage } from 'react-native-flash-message'
import ImageCard from '../../components/ImageCard'
import restaurantLogo from '../../../assets/restaurantLogo.jpeg'
import defaultProductImage from '../../../assets/product.jpeg'
import { OrderContext } from '../../context/OrderContext'

export default function RestaurantsScreen ({ navigation, route }) {
  const [restaurants, setRestaurants] = useState([])
  const [popular, setPopular] = useState([])
  const { ordersUpdated } = useContext(OrderContext) // Obtener el estado de ordersUpdated

  useEffect(() => {
    fetchRestaurants()
    fetchPopular()
  }, [route, ordersUpdated]) // Añadir ordersUpdated como dependencia

  const fetchRestaurants = async () => {
    try {
      const fetchedRestaurants = await getAllRestaurantsClient()
      setRestaurants(fetchedRestaurants)
    } catch (error) {
      showMessage({
        message: `There was an error while retrieving restaurants. ${error}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const fetchPopular = async () => {
    try {
      const fetchedPopular = await getPopular()
      setPopular(fetchedPopular)
    } catch (error) {
      showMessage({
        message: `There was an error while retrieving the popular products. ${error}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const renderRestaurant = ({ item }) => {
    return (
      <ImageCard
        imageUri={item.logo ? { uri: process.env.API_BASE_URL + '/' + item.logo } : restaurantLogo}
        title={item.name}
        onPress={() => {
          navigation.navigate('RestaurantDetailScreen', { id: item.id }) // Se navega a RestaurantDetailScreen con la id del restaurante como param
        }}
      >
        <TextRegular numberOfLines={2}>{item.description}</TextRegular>
        {item.averageServiceMinutes !== null &&
          <TextSemiBold>Avg. service time: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>{item.averageServiceMinutes} min.</TextSemiBold></TextSemiBold>
        }
        <TextSemiBold>Shipping: <TextSemiBold textStyle={{ color: GlobalStyles.brandPrimary }}>{item.shippingCosts.toFixed(2)}€</TextSemiBold></TextSemiBold>
      </ImageCard>
    )
  }

  const renderPopular = ({ item }) => {
    return (
      <ImageCard
        imageUri={item.image ? { uri: process.env.API_BASE_URL + '/' + item.image } : defaultProductImage}
        title={item.name}
        onPress={() => {
          navigation.navigate('RestaurantDetailScreen', { id: item.restaurantId }) // Si se pulsa sobre el producto se navega a los detalles del restaurante al que pertenece
        }}
      >
        <TextRegular numberOfLines={2}>{item.description}</TextRegular>
        <TextSemiBold textStyle={styles.price}>{item.price.toFixed(4)}€</TextSemiBold>
        {!item.availability &&
          <TextRegular textStyle={styles.availability}>Not available</TextRegular>
        }
      </ImageCard>
    )
  }

  const renderHeaderPopular = ({ item }) => {
    return (
      <>
        <TextSemiBold textStyle={styles.title}>
          TOP POPULAR PRODUCTS
        </TextSemiBold>
        <FlatList
          horizontal
          contentContainerStyle={styles.populares}
          data={popular}
          renderItem={renderPopular}
          keyExtractor={item => item.id.toString()}
          ListEmptyComponent={renderEmptyRestaurantsList}
        />
        <TextSemiBold textStyle={styles.title}>
          RESTAURANTS
        </TextSemiBold>
      </>
    )
  }

  const renderEmptyRestaurantsList = () => {
    return (
      <TextRegular textStyle={styles.emptyList}>
        No restaurants yet.
      </TextRegular>
    )
  }

  return (
    <FlatList
      data={restaurants}
      renderItem={renderRestaurant}
      keyExtractor={item => item.id.toString()}
      ListHeaderComponent={renderHeaderPopular}
      ListEmptyComponent={renderEmptyRestaurantsList}
    />
  )
}

const styles = StyleSheet.create({
  title: {
    fontSize: 30,
    marginTop: 40,
    textAlign: 'center',
    fontWeight: 'bold'
  },
  populares: {
    justifyContent: 'space-around',
    flex: 1
  },
  price: {
    textAlign: 'center',
    fontSize: 20,
    color: GlobalStyles.brandPrimary
  },
  button: {
    borderRadius: 8,
    height: 40,
    margin: 12,
    padding: 10,
    width: '100%'
  },
  text: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center'
  },
  emptyList: {
    textAlign: 'center',
    padding: 50
  },
  availability: {
    textAlign: 'center',
    fontSize: 20,
    fontStyle: 'italic',
    marginRight: 70,
    color: 'red'
  }
})
