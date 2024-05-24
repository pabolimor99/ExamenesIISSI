import React, { Children, createContext, useState } from "react"

export const OrderContext = createContext()

export const OrderProvider = ({ children }) => {
    const [ordersUpdated, setOrdersUpdated] = useState(false)

    return (
        <OrderContext.Provider value={{ ordersUpdated, setOrdersUpdated }} >
            { children }
        </OrderContext.Provider>
    )
}