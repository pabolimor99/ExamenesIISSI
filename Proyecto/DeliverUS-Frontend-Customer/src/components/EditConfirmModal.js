import React, { useState, useEffect } from 'react'
import { Modal, ScrollView, Pressable, StyleSheet, View, TextInput, FlatList } from 'react-native'
import TextSemiBold from './TextSemibold'
import TextRegular from './TextRegular'
import ImageCard from './ImageCard'
import * as GlobalStyles from '../styles/GlobalStyles'
import defaultProductImage from '../../assets/product.jpeg'

export default function EditConfirmModal (props) {
  const [totalPrice, setTotalPrice] = useState(0)
  const [shippingCost, setShippingCost] = useState(0)

  useEffect(() => {
    calculateTotals()
  }, [props.data, props.quantities])

  // Calcula el precio total y costes de envío del pedido modificado
  const calculateTotals = () => {
    let total = 0
    props.data.forEach(product => {
      total += props.quantities[product.id] * product.price
    })
    setTotalPrice(total)
    setShippingCost(total > 10 ? 0 : props.shippingCosts)
  }
  const renderProduct = ({ item }) => {
    return (
      <ImageCard
        imageUri={item.image ? { uri: process.env.API_BASE_URL + '/' + item.image } : defaultProductImage}
        title={item.name}
        contentContainerStyle={styles.imageCard}
      >
        <View style={styles.productTextContainer}>
          <TextSemiBold>{item.price.toFixed(2)}€</TextSemiBold>
          <TextRegular>Quantity: <TextSemiBold>{props.quantities[item.id]}</TextSemiBold></TextRegular>
          <TextRegular>Total: <TextSemiBold>{(props.quantities[item.id] * item.price).toFixed(2)} €</TextSemiBold></TextRegular>
        </View>
      </ImageCard>
    )
  }

  return (
    <Modal
      presentationStyle='overFullScreen'
      animationType='slide'
      transparent={true}
      visible={props.isVisible}
      onRequestClose={props.onCancel}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.centeredView}
      >
        <View style={styles.modalView}>
          <TextSemiBold textStyle={styles.modalTitle}>Order Summary</TextSemiBold>
          <FlatList
            ListEmptyComponent={() => <TextRegular>No products in the order.</TextRegular>}
            data={props.data}
            renderItem={renderProduct}
            keyExtractor={item => item.id.toString()}
          />
          <TextSemiBold>Address:</TextSemiBold>
          <TextInput
            style={styles.input}
            onChangeText={props.setAddr}
            value={props.addr}
            placeholder="Update address"
          />
          <View style={styles.priceContainer}>
            <TextSemiBold>Price (No Shipping Costs): {totalPrice.toFixed(2)} €</TextSemiBold>
            <TextSemiBold>Shipping Costs: {shippingCost.toFixed(2)} €</TextSemiBold>
            <TextSemiBold>Total Price: {(totalPrice + shippingCost).toFixed(2)} €</TextSemiBold>
          </View>
          <Pressable
            style={[styles.actionButton, { backgroundColor: GlobalStyles.brandGreen }]}
            onPress={props.onConfirm}
          >
            <TextRegular textStyle={styles.text}>Confirm Order</TextRegular>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: GlobalStyles.brandPrimary }]}
            onPress={props.onCancel}
          >
            <TextRegular textStyle={styles.text}>Cancel</TextRegular>
          </Pressable>
        </View>
      </ScrollView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
    backgroundColor: 'rgba(0,0,0,0.5)' // Fondo semitransparente
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.75,
    shadowRadius: 4,
    elevation: 5,
    width: '90%'
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 15,
    color: '#333'
  },
  input: {
    width: '100%',
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#f9f9f9'
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
  text: {
    fontSize: 16,
    color: 'white',
    alignSelf: 'center',
    marginLeft: 5
  },
  priceContainer: {
    width: '100%',
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    backgroundColor: '#f9f9f9'
  },
  productTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
    marginLeft: 10,
    marginRight: 10
  }
})
