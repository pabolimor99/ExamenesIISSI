import React from 'react'
import { View, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'

const QuantitySelector = ({ quantity, onQuantityChange }) => {
  const handleInputChange = (text) => {
    const newQuantity = parseInt(text, 10)
    if (!isNaN(newQuantity) && newQuantity >= 0) {
      onQuantityChange(newQuantity)
    }
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onQuantityChange(Math.max(0, quantity - 1))} // Prevent negative quantities
      >
        <MaterialCommunityIcons name="minus-circle" size={24} color="#ff6347" />
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={quantity.toString()}
        onChangeText={handleInputChange}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={() => onQuantityChange(quantity + 1)}
      >
        <MaterialCommunityIcons name="plus-circle" size={24} color="#4682b4" />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10
  },
  button: {
    marginHorizontal: 10,
    padding: 5
  },
  quantityText: {
    fontSize: 18,
    minWidth: 40,
    textAlign: 'center'
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 5,
    marginHorizontal: 10,
    textAlign: 'center',
    width: 40,
    height: 40
  }
})

export default QuantitySelector
