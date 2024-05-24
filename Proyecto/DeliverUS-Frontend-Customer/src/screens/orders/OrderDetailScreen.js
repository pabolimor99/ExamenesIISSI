/* eslint-disable react/prop-types */
import React, { useEffect, useState } from 'react'
import { ImageBackground, StyleSheet, View, Image, FlatList } from 'react-native'
import TextRegular from '../../components/TextRegular'
import TextSemiBold from '../../components/TextSemibold'
import { showMessage } from 'react-native-flash-message'
import ImageCard from '../../components/ImageCard'
import defaultProductImage from '../../../assets/product.jpeg'
import { getOrderDetail } from '../../api/OrderEndpoints'
import * as GlobalStyles from '../../styles/GlobalStyles'

export default function OrderDetailScreen ({ navigation, route }) {
  const [order, setOrder] = useState({})

  useEffect(() => {
    fetchOrderDetail()
  }, [route])

  const renderHeader = () => {
    return (
      <View>
        <ImageBackground source={(order.restaurant?.logo) ? { uri: process.env.API_BASE_URL + '/' + order.restaurant.logo, cache: 'force-cache' } : undefined}>
          <View style={styles.orderHeaderContainer}>
            <TextSemiBold textStyle={styles.textTitle}>{(order.restaurant?.name) ? order.restaurant.name : 'Restaurant Name'}</TextSemiBold>
            <Image source={(order.restaurant?.logo) ? { uri: process.env.API_BASE_URL + '/' + order.restaurant.logo, cache: 'force-cache' } : undefined} />
            <TextRegular textStyle={styles.description}>Order ID: <TextSemiBold>{order.id}</TextSemiBold></TextRegular>
            <TextRegular textStyle={styles.description}>Status: <TextSemiBold textStyle={order.status === 'in process' ? { color: GlobalStyles.brandPrimary } : order.status === 'sent' ? { color: GlobalStyles.brandGreen } : order.status === 'delivered' ? { color: 'purple' } : { color: GlobalStyles.brandSecondary }}>{order.status}</TextSemiBold></TextRegular>
            <TextRegular textStyle={styles.description}>Price: <TextSemiBold>{order.price}€</TextSemiBold></TextRegular>
            <TextRegular textStyle={styles.description}>Shipping Costs: <TextSemiBold>{order.shippingCosts}€</TextSemiBold></TextRegular>
            <TextRegular textStyle={styles.description}>Address: <TextRegular>{order.address}</TextRegular></TextRegular>
            <TextRegular textStyle={styles.description}>Order placed on: <TextSemiBold>{order.createdAt}</TextSemiBold></TextRegular>
          </View>
        </ImageBackground>
      </View>
    )
  }

  const fetchOrderDetail = async () => {
    try {
      const fetchedOrder = await getOrderDetail(route.params.id)
      setOrder(fetchedOrder)
    } catch (error) {
      showMessage({
        message: `There was an error while retrieving order details (id ${route.params.id}). ${error}`,
        type: 'error',
        style: GlobalStyles.flashStyle,
        titleStyle: GlobalStyles.flashTextStyle
      })
    }
  }

  const renderProduct = ({ item }) => {
    return (
      <ImageCard
        imageUri={item.image ? { uri: process.env.API_BASE_URL + '/' + item.image } : defaultProductImage}
        title={item.name}
      >
        <TextRegular numberOfLines={2}>{item.description}</TextRegular>
          <TextSemiBold textStyle={styles.price}>{item.price.toFixed(2)}€</TextSemiBold>
          <TextRegular>Quantity: <TextSemiBold textStyle={styles.price}>{item.OrderProducts.quantity}</TextSemiBold></TextRegular>
      </ImageCard>
    )
  }

  const renderEmptyProductsList = () => {
    return (
      <TextRegular>
        This order has no products.
      </TextRegular>
    )
  }

  return (
    <FlatList
      ListEmptyComponent={renderEmptyProductsList}
      data={order.products}
      renderItem={renderProduct}
      keyExtractor={item => item.id.toString()}
      ListHeaderComponent={renderHeader}
    />
  )
}

const styles = StyleSheet.create({
  orderHeaderContainer: {
    height: 250,
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 50
  },
  description: {
    color: 'white'
  },
  textTitle: {
    fontSize: 20,
    color: 'white'
  }
})
