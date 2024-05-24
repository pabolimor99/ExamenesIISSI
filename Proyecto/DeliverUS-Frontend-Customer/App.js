import React from 'react'
import AppContextProvider from './src/context/AppContext'
import AuthorizationContextProvider from './src/context/AuthorizationContext'
import Layout from './src/screens/Layout'
import { OrderProvider } from './src/context/OrderContext'

export default function App () {
  return (
    <AppContextProvider>
    <AuthorizationContextProvider>
      <OrderProvider>
        <Layout />
      </OrderProvider>
    </AuthorizationContextProvider>
    </AppContextProvider>
  )
}
