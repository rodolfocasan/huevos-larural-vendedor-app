// App.js
import React, { useState, useEffect } from 'react';
import { View, StatusBar, SafeAreaView, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from './Components/Utils/Constants';

import Header from './Components/Home/Header.js';
import SalesContainer from './Components/Home/SalesContainer';





// Componente principal de la aplicación
export default function App() {
  // Estado para la ID de la venta actual
  const [currentSaleId, setCurrentSaleId] = useState(null);

  // Estado para la lista de ventas
  const [sales, setSales] = useState([]);

  // Estado para el precio por cartón de huevos, con un valor predeterminado de $4.00
  const [eggsPrice, setEggsPrice] = useState(4);

  // Estado para la lista de ubicaciones de venta
  const [locations, setLocations] = useState(['Bodega']);

  // Estado para la ubicación de venta seleccionada actualmente
  const [currentLocation, setCurrentLocation] = useState('Bodega');

  // Efecto para cargar el precio de los cartones, las ventas y la ubicación de venta al iniciar la aplicación
  useEffect(() => {
    loadEggsPrice();
    loadSales();
    loadLocations();
  }, []);

  // Función asíncrona para cargar las ubicaciones de venta desde AsyncStorage
  const loadLocations = async () => {
    try {
      const storedLocations = await AsyncStorage.getItem('@locations');
      if (storedLocations !== null) {
        const parsedLocations = JSON.parse(storedLocations);
        setLocations(parsedLocations);
        // Establecer la primera ubicación como predeterminada si existe
        if (parsedLocations.length > 0) {
          setCurrentLocation(parsedLocations[0]);
        }
      }
    } catch (e) {
      console.error('No se pudo cargar las ubicaciones:', e);
    }
  };

  // Función asíncrona para guardar las ubicaciones en AsyncStorage
  const saveLocations = async (newLocations) => {
    try {
      await AsyncStorage.setItem('@locations', JSON.stringify(newLocations));
      setLocations(newLocations);
    } catch (e) {
      console.error('No se pudo guardar las ubicaciones:', e);
    }
  };

  // Función para añadir una nueva ubicación
  const addLocation = (newLocation) => {
    if (newLocation && !locations.includes(newLocation)) {
      const updatedLocations = [...locations, newLocation];
      saveLocations(updatedLocations);
    }
  };

  // Función asíncrona para cargar el precio de los cartones desde AsyncStorage
  const loadEggsPrice = async () => {
    try {
      const storedPrice = await AsyncStorage.getItem('@eggs_price');
      if (storedPrice !== null) {
        setEggsPrice(parseFloat(storedPrice));
      }
    } catch (e) {
      console.error('No se pudo cargar el precio de los huevos:', e);
    }
  };

  // Función asíncrona para guardar el precio de los cartones en AsyncStorage
  const saveEggsPrice = async (price) => {
    try {
      await AsyncStorage.setItem('@eggs_price', price.toString());
      setEggsPrice(price);
    } catch (e) {
      console.error('No se pudo guardar el precio de los huevos:', e);
    }
  };

  // Función asíncrona para cargar las ventas desde AsyncStorage
  const loadSales = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const saleKeys = keys.filter(key => key.startsWith('@sale_'));

      if (saleKeys.length === 0) {
        // Crear la primera venta si no existen ventas
        const firstSale = {
          id: '1',
          name: 'Venta #01',
          transactions: [],
          expenses: [],
          createdAt: new Date().toISOString(),
        };
        await saveSale(firstSale);
        setSales([firstSale]);
        setCurrentSaleId('1');
      } else {
        const salesData = await AsyncStorage.multiGet(saleKeys);
        const parsedSales = salesData.map(([key, value]) => JSON.parse(value))
          .sort((a, b) => parseInt(a.id) - parseInt(b.id));

        setSales(parsedSales);

        // Seleccionar la última venta por defecto en lugar de la primera
        setCurrentSaleId(parsedSales[parsedSales.length - 1].id);
      }
    } catch (e) {
      console.error('No se pudieron cargar las ventas:', e);
    }
  };

  // Función asíncrona para guardar una venta en AsyncStorage
  const saveSale = async (sale) => {
    try {
      await AsyncStorage.setItem(`@sale_${sale.id}`, JSON.stringify(sale));
    } catch (e) {
      console.error('No se pudo guardar la venta:', e);
    }
  };

  // Función asíncrona para crear una nueva venta
  const createNewSale = async () => {
    try {
      // Generar una nueva ID basada en la máxima ID existente
      const newId = (Math.max(...sales.map(s => parseInt(s.id)), 0) + 1).toString();
      const newSale = {
        id: newId,
        name: `Venta #${newId.padStart(2, '0')}`,
        transactions: [],
        expenses: [],
        createdAt: new Date().toISOString(),
      };

      await saveSale(newSale);
      setSales([...sales, newSale]);
      setCurrentSaleId(newId);
    } catch (e) {
      console.error('No se pudo crear una nueva venta:', e);
    }
  };

  // Función asíncrona para actualizar una venta existente
  const updateSale = async (updatedSale) => {
    try {
      await saveSale(updatedSale);
      setSales(sales.map(sale =>
        sale.id === updatedSale.id ? updatedSale : sale
      ));
    } catch (e) {
      console.error('No se pudo actualizar la venta:', e);
    }
  };

  // Obtener la venta actual basada en la ID
  const currentSale = sales.find(sale => sale.id === currentSaleId) || null;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.contentContainer}>
        <Header
          sales={sales}
          currentSaleId={currentSaleId}
          setCurrentSaleId={setCurrentSaleId}
          createNewSale={createNewSale}
          eggsPrice={eggsPrice}
          saveEggsPrice={saveEggsPrice}
        />
        <SalesContainer
          sale={currentSale}
          updateSale={updateSale}
          eggsPrice={eggsPrice}
          locations={locations}
          currentLocation={currentLocation}
          setCurrentLocation={setCurrentLocation}
          addLocation={addLocation}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});