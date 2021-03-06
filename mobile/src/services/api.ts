import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:3030',
})

export interface Item {
  id: number
  title: string
  imageUrl: string
}

export interface Point {
  point: {
    _id: number
    name: string
    image: string
    email: string
    whatsapp: string
    city: string
    uf: string
    latitude: number
    longitude: number
  }
  items?: string[]
}

export interface PointList {
  _id: number
  name: string
  image: string
  email: string
  whatsapp: string
  city: string
  uf: string
  latitude: number
  longitude: number
  items?: string[]
}

export default api
