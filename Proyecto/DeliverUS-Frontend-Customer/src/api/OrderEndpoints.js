import { destroy, get, put, post } from './helpers/ApiRequestsHelper'

function getAll () {
  return get('orders')
}

function getOrderDetail (id) {
  return get(`orders/${id}`)
}

function remove (id) {
  return destroy(`orders/${id}`)
}

function update (id, data) {
  return put(`orders/${id}`, data)
}

function create (data) {
  return post('orders', data)
}

export { getAll, getOrderDetail, remove, update, create }
