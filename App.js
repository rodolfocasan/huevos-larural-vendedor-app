// App.js
import React, { useState, useEffect } from 'react';
import { View, StatusBar, SafeAreaView, StyleSheet, Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-get-random-values';

import Header from './Components/Home/Header.js';
import SalesContainer from './Components/Home/SalesContainer';

import { COLORS } from './Components/Utils/Constants';





// Componente principal de la aplicación
export default function App() {
  // Estado para la venta única
  const [sale, setSale] = useState({
    transactions: [],
    expenses: [],
    clients: [],
    createdAt: new Date().toISOString(),
  });

  // Estado para el precio por cartón de huevos, con un valor predeterminado
  const [eggsPrice, setEggsPrice] = useState(4);

  // Estado para la lista de ubicaciones de venta
  const [locations, setLocations] = useState(['Comercio Móvil']);

  // Estado para la ubicación de venta seleccionada actualmente
  const [currentLocation, setCurrentLocation] = useState('Comercio Móvil');

  // Estados para parámetros de REV
  const [purchasePrice, setPurchasePrice] = useState(2.50);
  const [showAnalysis, setShowAnalysis] = useState(false);



  // Tamaño máximo por fragmento (500KB para mayor seguridad)
  const CHUNK_SIZE = 500000;

  // Función para dividir los datos en fragmentos
  const splitIntoChunks = (data, chunkSize) => {
    const stringData = JSON.stringify(data);
    const chunks = [];
    for (let i = 0; i < stringData.length; i += chunkSize) {
      chunks.push(stringData.slice(i, i + chunkSize));
    }
    return chunks;
  };

  // Función para recombinar los fragmentos en los datos originales
  const combineChunks = (chunks) => {
    const combinedString = chunks.join('');
    return JSON.parse(combinedString);
  };



  // Función para crear backup temporal antes de guardar
  const createBackup = async (key, data) => {
    try {
      const backupKey = `${key}_backup_${Date.now()}`;
      await AsyncStorage.setItem(backupKey, JSON.stringify(data));
      return backupKey;
    } catch (e) {
      console.error('Error creando backup:', e);
      return null;
    }
  };

  // Función para limpiar backups antiguos (mantener solo los 3 más recientes)
  const cleanOldBackups = async (baseKey) => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const backupKeys = allKeys
        .filter(key => key.startsWith(`${baseKey}_backup_`))
        .sort((a, b) => {
          const timestampA = parseInt(a.split('_backup_')[1]);
          const timestampB = parseInt(b.split('_backup_')[1]);
          return timestampB - timestampA; // Más recientes primero
        });

      // Eliminar backups antiguos (mantener solo 3)
      if (backupKeys.length > 3) {
        const keysToRemove = backupKeys.slice(3);
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (e) {
      console.error('Error limpiando backups:', e);
    }
  };

  // Función para verificar integridad de datos
  const verifyDataIntegrity = async (key, expectedData) => {
    try {
      const storedData = await AsyncStorage.getItem(key);
      if (storedData === null) return false;

      const parsedData = JSON.parse(storedData);
      return JSON.stringify(parsedData) === JSON.stringify(expectedData);
    } catch (e) {
      console.error('Error verificando integridad:', e);
      return false;
    }
  };

  // FUNCIÓN ADICIONAL: Verificación de integridad al inicio de la app
  const verifyAppDataIntegrity = async () => {
    try {
      console.log('Verificando integridad de datos al iniciar...');

      // Verificar venta
      const saleChunks = await AsyncStorage.getItem('@sale_chunks');
      if (saleChunks) {
        const chunks = [];
        const count = parseInt(saleChunks);

        for (let i = 0; i < count; i++) {
          const chunk = await AsyncStorage.getItem(`@sale_chunk_${i}`);
          if (!chunk) {
            console.warn(`Chunk ${i} de venta faltante, intentando recuperar...`);
            // Aquí podrías implementar lógica de recuperación
            return false;
          }
          chunks.push(chunk);
        }
      }

      // Verificar precio
      const storedPrice = await AsyncStorage.getItem('@eggs_price');
      if (!storedPrice || isNaN(parseFloat(storedPrice))) {
        console.warn('Precio inválido, restaurando valor por defecto...');
        await AsyncStorage.setItem('@eggs_price', '4.00');
      }

      // Verificar ubicaciones
      const storedLocations = await AsyncStorage.getItem('@locations');
      if (!storedLocations) {
        console.warn('Ubicaciones faltantes, restaurando valor por defecto...');
        await AsyncStorage.setItem('@locations', JSON.stringify(['Comercio Móvil']));
      }

      console.log('Verificación de integridad completada');
      return true;

    } catch (e) {
      console.error('Error en verificación de integridad:', e);
      return false;
    }
  };



  // Efecto MEJORADO para cargar y verificar datos al iniciar la aplicación
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 1. Verificar integridad de datos antes de cargar
        const integrityOk = await verifyAppDataIntegrity();
        if (!integrityOk) {
          console.warn('Se detectaron problemas de integridad, aplicando correcciones...');
        }

        // 2. Cargar datos con orden específico
        await loadEggsPrice();
        await loadPurchasePrice();
        await loadShowAnalysis();
        await loadLocations();
        await loadSale();

        console.log('Aplicación inicializada correctamente');
      } catch (e) {
        console.error('Error crítico inicializando la aplicación:', e);

        // Crear datos mínimos de emergencia
        const emergencySale = {
          transactions: [],
          expenses: [],
          clients: [],
          createdAt: new Date().toISOString(),
        };

        setSale(emergencySale);
        setEggsPrice(4.00);
        setLocations(['Comercio Móvil']);
      }
    };

    initializeApp();
  }, []);





  // Función para cargar precio de compra
  const loadPurchasePrice = async () => {
    try {
      const storedPrice = await AsyncStorage.getItem('@purchase_price');
      if (storedPrice !== null) {
        setPurchasePrice(parseFloat(storedPrice));
      }
    } catch (e) {
      console.error('No se pudo cargar el precio de compra:', e);
    }
  };

  // Función para guardar precio de compra
  const savePurchasePrice = async (price) => {
    try {
      await AsyncStorage.setItem('@purchase_price', price.toString());
      setPurchasePrice(price);
    } catch (e) {
      console.error('Error guardando el precio de compra:', e);
    }
  };

  // Función para cargar estado del análisis
  const loadShowAnalysis = async () => {
    try {
      const storedShow = await AsyncStorage.getItem('@show_analysis');
      if (storedShow !== null) {
        setShowAnalysis(JSON.parse(storedShow));
      }
    } catch (e) {
      console.error('No se pudo cargar el estado del análisis:', e);
    }
  };

  // Función para guardar estado del análisis
  const saveShowAnalysis = async (show) => {
    try {
      await AsyncStorage.setItem('@show_analysis', JSON.stringify(show));
      setShowAnalysis(show);
    } catch (e) {
      console.error('Error guardando el estado del análisis:', e);
    }
  };

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

  // Función asíncrona MEJORADA para guardar las ubicaciones con verificación
  const saveLocations = async (newLocations) => {
    try {
      // 1. Crear backup
      const currentLocations = await AsyncStorage.getItem('@locations');
      if (currentLocations) {
        await AsyncStorage.setItem('@locations_backup', currentLocations);
      }

      // 2. Guardar nuevas ubicaciones
      const locationsString = JSON.stringify(newLocations);
      await AsyncStorage.setItem('@locations', locationsString);

      // 3. Verificar que se guardó correctamente
      const verification = await AsyncStorage.getItem('@locations');
      if (verification !== locationsString) {
        throw new Error('Fallo en verificación de ubicaciones');
      }

      // 4. Actualizar estado solo si el guardado fue exitoso
      setLocations(newLocations);

      console.log('Ubicaciones guardadas y verificadas exitosamente');

    } catch (e) {
      console.error('ERROR guardando las ubicaciones:', e);

      // Intentar recuperar ubicaciones anteriores
      try {
        const backupLocations = await AsyncStorage.getItem('@locations_backup');
        if (backupLocations) {
          await AsyncStorage.setItem('@locations', backupLocations);
          const parsedBackup = JSON.parse(backupLocations);
          setLocations(parsedBackup);
          console.log('Ubicaciones restauradas desde backup');
        }
      } catch (backupError) {
        console.error('Error restaurando ubicaciones desde backup:', backupError);
      }

      throw e;
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

  // Función asíncrona MEJORADA para guardar el precio con verificación
  const saveEggsPrice = async (price) => {
    try {
      // 1. Crear backup
      const currentPrice = await AsyncStorage.getItem('@eggs_price');
      if (currentPrice) {
        await AsyncStorage.setItem('@eggs_price_backup', currentPrice);
      }

      // 2. Guardar nuevo precio
      const priceString = price.toString();
      await AsyncStorage.setItem('@eggs_price', priceString);

      // 3. Verificar que se guardó correctamente
      const verification = await AsyncStorage.getItem('@eggs_price');
      if (verification !== priceString) {
        throw new Error('Fallo en verificación del precio');
      }

      // 4. Actualizar estado solo si el guardado fue exitoso
      setEggsPrice(price);

      console.log('Precio guardado y verificado exitosamente');

    } catch (e) {
      console.error('ERROR guardando el precio de los huevos:', e);

      // Intentar recuperar precio anterior
      try {
        const backupPrice = await AsyncStorage.getItem('@eggs_price_backup');
        if (backupPrice) {
          await AsyncStorage.setItem('@eggs_price', backupPrice);
          console.log('Precio restaurado desde backup');
        }
      } catch (backupError) {
        console.error('Error restaurando precio desde backup:', backupError);
      }

      throw e;
    }
  };

  // Función para verificar integridad de la venta completa
  const verifySaleIntegrity = async (originalData) => {
    try {
      const chunksCount = await AsyncStorage.getItem('@sale_chunks');
      if (!chunksCount) return false;

      const chunks = [];
      const count = parseInt(chunksCount);

      for (let i = 0; i < count; i++) {
        const chunk = await AsyncStorage.getItem(`@sale_chunk_${i}`);
        if (!chunk) return false;
        chunks.push(chunk);
      }

      const reconstructedData = combineChunks(chunks);
      return JSON.stringify(reconstructedData) === JSON.stringify(originalData);
    } catch (e) {
      console.error('Error en verificación de integridad:', e);
      return false;
    }
  };

  // Función asíncrona para cargar la venta desde AsyncStorage, recombinando los fragmentos
  const loadSale = async () => {
    try {
      const chunksCount = await AsyncStorage.getItem('@sale_chunks');

      if (chunksCount === null) {
        // Crear venta inicial si no existe
        const initialSale = {
          transactions: [],
          expenses: [],
          clients: [],
          createdAt: new Date().toISOString(),
        };
        await saveSale(initialSale);
        setSale(initialSale);
      } else {
        const chunks = [];
        const count = parseInt(chunksCount);
        for (let i = 0; i < count; i++) {
          const chunk = await AsyncStorage.getItem(`@sale_chunk_${i}`);
          chunks.push(chunk);
        }
        const saleData = combineChunks(chunks);
        setSale(saleData);
      }
    } catch (e) {
      console.error('No se pudo cargar la venta:', e);
    }
  };

  // Función asíncrona MEJORADA para guardar la venta con sistema de respaldo
  const saveSale = async (saleData) => {
    try {
      // 1. Crear backup antes de guardar
      const backupKey = await createBackup('@sale', saleData);

      // 2. Preparar datos para guardar
      const chunks = splitIntoChunks(saleData, CHUNK_SIZE);
      const totalChunks = chunks.length;

      // 3. Guardar primero el número de chunks
      await AsyncStorage.setItem('@sale_chunks', totalChunks.toString());

      // 4. Guardar cada chunk con verificación inmediata
      for (let i = 0; i < totalChunks; i++) {
        const chunkKey = `@sale_chunk_${i}`;
        await AsyncStorage.setItem(chunkKey, chunks[i]);

        // Verificar inmediatamente que se guardó correctamente
        const verification = await AsyncStorage.getItem(chunkKey);
        if (verification !== chunks[i]) {
          throw new Error(`Fallo en verificación del chunk ${i}`);
        }
      }

      // 5. Verificación final de integridad completa
      const verificationPassed = await verifySaleIntegrity(saleData);
      if (!verificationPassed) {
        throw new Error('Fallo en verificación de integridad final');
      }

      // 6. Limpiar backups antiguos
      await cleanOldBackups('@sale');

      // 7. Marcar como guardado exitosamente
      await AsyncStorage.setItem('@sale_last_saved', new Date().toISOString());

      console.log('Venta guardada exitosamente con verificación completa');

    } catch (e) {
      console.error('ERROR CRÍTICO guardando la venta:', e);

      // Intentar recuperar desde backup si existe
      try {
        const allKeys = await AsyncStorage.getAllKeys();
        const backupKeys = allKeys
          .filter(key => key.startsWith('@sale_backup_'))
          .sort((a, b) => {
            const timestampA = parseInt(a.split('_backup_')[1]);
            const timestampB = parseInt(b.split('_backup_')[1]);
            return timestampB - timestampA;
          });

        if (backupKeys.length > 0) {
          const latestBackup = await AsyncStorage.getItem(backupKeys[0]);
          const backupData = JSON.parse(latestBackup);
          console.log('Intentando recuperar desde backup más reciente...');
          // Recursiva para intentar guardar el backup
          await saveSale(backupData);
        }
      } catch (backupError) {
        console.error('Error también en recuperación de backup:', backupError);
        throw new Error('FALLA CRÍTICA: No se pudo guardar ni recuperar datos');
      }
    }
  };

  // Función asíncrona MEJORADA para actualizar la venta con protección máxima
  const updateSale = async (updatedSale) => {
    try {
      // 1. Primero intentar guardar
      await saveSale(updatedSale);

      // 2. Verificar que se guardó correctamente antes de actualizar el estado
      const verificationPassed = await verifySaleIntegrity(updatedSale);
      if (!verificationPassed) {
        throw new Error('La verificación de guardado falló');
      }

      // 3. Solo actualizar el estado si el guardado fue exitoso
      setSale(updatedSale);

      console.log('Venta actualizada y verificada exitosamente');

    } catch (e) {
      console.error('ERROR CRÍTICO actualizando la venta:', e);

      // Mostrar alerta al usuario sobre el problema
      Alert.alert(
        'Error de Guardado Crítico',
        'No se pudo guardar la información de manera segura. Los datos pueden perderse. Intente la operación nuevamente.',
        [{ text: 'Entendido', style: 'destructive' }]
      );

      throw e; // Re-lanzar el error para que lo maneje el componente
    }
  };

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.contentContainer}>
            <Header
              eggsPrice={eggsPrice}
              saveEggsPrice={saveEggsPrice}
              purchasePrice={purchasePrice}
              savePurchasePrice={savePurchasePrice}
              showAnalysis={showAnalysis}
              saveShowAnalysis={saveShowAnalysis}
              sale={sale}
              updateSale={updateSale}
            />
            <View style={styles.salesContainer}>
              <SalesContainer
                sale={sale}
                updateSale={updateSale}
                eggsPrice={eggsPrice}
                locations={locations}
                currentLocation={currentLocation}
                setCurrentLocation={setCurrentLocation}
                addLocation={addLocation}
                purchasePrice={purchasePrice}
                showAnalysis={showAnalysis}
              />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  salesContainer: {
    flex: 1,
  },
});