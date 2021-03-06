import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react'
import { FiArrowLeft } from 'react-icons/fi'
import { Link, useHistory } from 'react-router-dom'
import { Map, TileLayer, Marker } from 'react-leaflet'
import { LeafletMouseEvent, LatLng } from 'leaflet'
import * as yup from 'yup'

import CompletedForm from '../../components/CompletedForm'
import Dropzone from '../../components/Dropzone'
import api, { Item } from '../../services/api'
import ibgeLocalityApi, {
  UFResponse,
  CityResponse,
} from '../../services/ibgeLocalityApi'

import logo from '../../assets/logo.svg'

import './styles.css'

interface Uf {
  id: number
  name: string
}

const CreatePoint = () => {
  const [ufs, setUfs] = useState<Uf[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [cities, setCities] = useState<string[]>([])
  const [completedFormVisible, setCompletedFormVisible] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const [initialPosition, setInitialPosition] = useState<LatLng>()

  const [inputsData, setInputsData] = useState({
    name: '',
    email: '',
    whatsapp: 0,
  })

  const [selectedUf, setSelectedUf] = useState<Uf>()
  const [selectedCity, setSelectedCity] = useState('')
  const [selectedLatLng, setSelectedLatLng] = useState<LatLng>()
  const [selectedItemsId, setSelectedItemsId] = useState<number[]>([])
  const [selectedImage, setSelectedImage] = useState<File>()

  const history = useHistory()

  yup.setLocale({
    mixed: {
      required: 'é um campo necessário',
      default: 'não é válido',
    },
    number: {
      integer: 'deve ser inteiro',
      positive: 'deve ser positivo',
      min: 'deve ser maior que ${min}',
      max: 'deve ser menor que ${max}',
    },
    string: {
      max: 'deve ter no máximo ${max} caracteres',
      email: 'deve ser um email valido',
    },
  })

  const formSchema = yup.object().shape({
    nome: yup.string().max(20).required(),
    email: yup.string().email().required(),
    whatsapp: yup
      .number()
      .positive()
      .integer()
      .min(10000000000)
      .max(99999999999999)
      .required(),
    uf: yup.string().required(),
    endereço: yup.mixed().required(),
    cidade: yup.string().required(),
    items: yup.array().of(yup.number()).required(),
    imagem: yup.mixed().required(),
  })

  useEffect(() => {
    fetchItems()
    fetchUfs()

    navigator.geolocation.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords

      setInitialPosition({
        lat: latitude,
        lng: longitude,
      } as LatLng)
    })
  }, [])

  useEffect(() => {
    if (!selectedUf || selectedUf.id === 0) {
      setCities([])
      return
    }

    fetchCitiesByUf(selectedUf.id)
  }, [selectedUf])

  const fetchItems = async () => {
    const response = await api.get('items')

    setItems(response.data)
  }

  const fetchUfs = async () => {
    const response = await ibgeLocalityApi.get<UFResponse[]>('estados', {
      params: {
        orderBy: 'nome',
      },
    })

    setUfs(
      response.data.map((uf) => {
        return {
          id: uf.id,
          name: uf.nome,
        }
      })
    )
  }

  const fetchCitiesByUf = async (ufId: number) => {
    const response = await ibgeLocalityApi.get<CityResponse[]>(
      `estados/${ufId}/municipios`,
      {
        params: {
          orderBy: 'nome',
        },
      }
    )

    setCities(response.data.map((city) => city.nome))
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target

    setInputsData({ ...inputsData, [name]: value })
  }

  const handleSelectedUf = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedUf({
      id: Number(event.target.value),
      name: event.target.options[event.target.selectedIndex].text,
    })
  }

  const handleSelectedCity = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCity(event.target.value)
  }

  const handleMapClick = (event: LeafletMouseEvent) => {
    setSelectedLatLng(event.latlng)
  }

  const handleSelectItems = (itemId: number) => {
    if (selectedItemsId.includes(itemId)) {
      setSelectedItemsId(selectedItemsId.filter((id) => id !== itemId))
      return
    }

    setSelectedItemsId([...selectedItemsId, itemId])
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const { name, email, whatsapp } = inputsData
    const uf = selectedUf?.name
    const city = selectedCity
    const latitude = selectedLatLng?.lat
    const longitude = selectedLatLng?.lng
    const items = selectedItemsId

    try {
      await formSchema.validate({
        nome: name,
        email,
        whatsapp,
        uf,
        cidade: city,
        endereço: latitude,
        items,
        imagem: selectedImage,
      })

      try {
        setErrorMessage('')

        const data = new FormData()

        data.append('name', name)
        data.append('email', email)
        data.append('whatsapp', String(whatsapp))
        data.append('uf', String(uf))
        data.append('city', city)
        data.append('latitude', String(latitude))
        data.append('longitude', String(longitude))
        data.append('items', items.join(','))

        if (selectedImage) data.append('image', selectedImage)

        await api.post('point', data)
        setCompletedFormVisible(true)

        setTimeout(() => history.push('/'), 2000)
      } catch (error) {
        setErrorMessage('Algo deu errado')

        setCompletedFormVisible(true)
        setTimeout(() => setCompletedFormVisible(false), 2000)
      }
    } catch (error) {
      const err = error as yup.ValidationError

      setErrorMessage(
        err.path.charAt(0).toUpperCase() + err.path.slice(1) + ' ' + err.message
      )

      setCompletedFormVisible(true)
      setTimeout(() => setCompletedFormVisible(false), 2000)
    }
  }

  return (
    <>
      <div id="page-create-point">
        <div className="content">
          <header>
            <img src={logo} alt="Ecoleta logo" />

            <Link to="/">
              <FiArrowLeft />
              Voltar para home
            </Link>
          </header>

          <form onSubmit={handleSubmit}>
            <h1>
              Cadastro do <br /> ponto de coleta
            </h1>

            <Dropzone onImageUploaded={setSelectedImage} />

            <fieldset>
              <legend>
                <h2>Dados</h2>
              </legend>

              <div className="field">
                <label htmlFor="name">Nome da entidade</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  onChange={handleInputChange}
                />
              </div>

              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="text"
                  onChange={handleInputChange}
                />
              </div>

              <div className="field">
                <label htmlFor="whatsapp">WhatsApp</label>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="text"
                  onChange={handleInputChange}
                />
              </div>
            </fieldset>

            <fieldset>
              <legend>
                <h2>Endereço</h2>
                <span>Selecione o endereço no mapa</span>
              </legend>

              <Map
                center={
                  initialPosition && [initialPosition.lat, initialPosition.lng]
                }
                zoom={15}
                onclick={handleMapClick}
              >
                <TileLayer
                  attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {selectedLatLng && (
                  <Marker position={[selectedLatLng.lat, selectedLatLng.lng]} />
                )}
              </Map>

              <div className="field-group">
                <div className="field">
                  <label htmlFor="uf">Estado (UF)</label>
                  <select name="uf" id="uf" onChange={handleSelectedUf}>
                    <option value="0">Selecione uma UF</option>
                    {ufs.map((uf) => (
                      <option key={uf.id} value={uf.id}>
                        {uf.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="city">Cidade</label>
                  <select
                    name="city"
                    id="city"
                    value={selectedCity}
                    onChange={handleSelectedCity}
                  >
                    <option value="0">Selecione uma cidade</option>
                    {cities.length === 0 ? (
                      <option value="0" disabled>
                        Selecione primeiro uma UF
                      </option>
                    ) : (
                      cities.map((city, index) => (
                        <option key={index} value={city}>
                          {city}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend>
                <h2>Ítems de coleta</h2>
              </legend>

              <ul className="items-grid">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className={
                      selectedItemsId.includes(item.id) ? 'selected' : ''
                    }
                    onClick={() => handleSelectItems(item.id)}
                  >
                    <img src={item.imageUrl} alt={'Imagem ' + item.title} />
                    <span>{item.title}</span>
                  </li>
                ))}
              </ul>
            </fieldset>

            <button type="submit">Cadastrar ponto de coleta</button>
          </form>
        </div>
      </div>
      {completedFormVisible && <CompletedForm error={errorMessage} />}
    </>
  )
}

export default CreatePoint
