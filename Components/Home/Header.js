// Components/Home/Header.js
import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, TouchableOpacity, StyleSheet, Modal, TextInput, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { v4 as uuidv4 } from 'uuid';

import { COLORS } from '../Utils/Constants';





// Componente Header que maneja el encabezado de la aplicación
const Header = ({ eggsPrice, saveEggsPrice, purchasePrice, savePurchasePrice, showAnalysis, saveShowAnalysis, sale, updateSale }) => {
    // Obtener las dimensiones del área segura del dispositivo
    const insets = useSafeAreaInsets();

    // Estado para controlar la visibilidad del modal de configuración
    const [settingsVisible, setSettingsVisible] = useState(false);

    // Estado para controlar la visibilidad del submenú de precios
    const [priceMenuVisible, setPriceMenuVisible] = useState(false);

    // Estado para las opciones de precio personalizadas
    const [priceOptions, setPriceOptions] = useState([4.00]);

    // Estado temporal para agregar nuevo precio
    const [newPriceInput, setNewPriceInput] = useState('');

    // Estado para mostrar el campo de agregar precio
    const [showAddPrice, setShowAddPrice] = useState(false);

    // Estado para el input del precio de compra
    const [purchasePriceInput, setPurchasePriceInput] = useState(purchasePrice.toString());

    // Estados para los modales de sincronización
    const [exportModalVisible, setExportModalVisible] = useState(false);
    const [importModalVisible, setImportModalVisible] = useState(false);

    // Actualizar el input cuando cambie el precio de compra
    useEffect(() => {
        setPurchasePriceInput(purchasePrice.toString());
    }, [purchasePrice]);

    // Cargar opciones de precio al inicializar el componente
    useEffect(() => {
        loadPriceOptions();
    }, []);

    // Función para cargar las opciones de precio desde AsyncStorage
    const loadPriceOptions = async () => {
        try {
            const storedOptions = await AsyncStorage.getItem('@price_options');
            if (storedOptions !== null) {
                const parsedOptions = JSON.parse(storedOptions);
                setPriceOptions(parsedOptions);
            }
        } catch (e) {
            console.error('No se pudo cargar las opciones de precio:', e);
        }
    };

    // Función para guardar las opciones de precio en AsyncStorage
    const savePriceOptions = async (options) => {
        try {
            await AsyncStorage.setItem('@price_options', JSON.stringify(options));
            setPriceOptions(options);
        } catch (e) {
            console.error('No se pudo guardar las opciones de precio:', e);
        }
    };

    // Función para alternar la visibilidad del modal de configuración
    const toggleSettings = () => {
        setSettingsVisible(!settingsVisible);
        if (settingsVisible) {
            setPriceMenuVisible(false);
            setShowAddPrice(false);
            setNewPriceInput('');
        }
    };

    // Función para alternar el submenú de precios
    const togglePriceMenu = () => {
        setPriceMenuVisible(!priceMenuVisible);
        setShowAddPrice(false);
        setNewPriceInput('');
    };

    // Función para seleccionar un precio de las opciones
    const selectPrice = (price) => {
        saveEggsPrice(price);
        setPriceMenuVisible(false);
    };

    // Función para eliminar una opción de precio
    const removePriceOption = (priceToRemove) => {
        if (priceOptions.length <= 1) {
            Alert.alert('Error', 'Debe mantener al menos una opción de precio');
            return;
        }

        Alert.alert(
            'Confirmar eliminación',
            `¿Desea eliminar la opción de precio $${priceToRemove.toFixed(2)}?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: () => {
                        const updatedOptions = priceOptions.filter(price => price !== priceToRemove);
                        savePriceOptions(updatedOptions);

                        // Si el precio eliminado era el actual, cambiar al primero disponible
                        if (eggsPrice === priceToRemove && updatedOptions.length > 0) {
                            saveEggsPrice(updatedOptions[0]);
                        }
                    }
                }
            ]
        );
    };

    // Función para agregar una nueva opción de precio
    const addPriceOption = () => {
        const newPrice = parseFloat(newPriceInput);
        if (isNaN(newPrice) || newPrice <= 0) {
            Alert.alert('Error', 'Ingrese un precio válido');
            return;
        }

        if (priceOptions.includes(newPrice)) {
            Alert.alert('Error', 'Esta opción de precio ya existe');
            return;
        }

        const updatedOptions = [...priceOptions, newPrice].sort((a, b) => a - b);
        savePriceOptions(updatedOptions);
        setNewPriceInput('');
        setShowAddPrice(false);
    };

    // Función para actualizar el precio de compra
    const updatePurchasePrice = () => {
        const newPrice = parseFloat(purchasePriceInput);
        if (isNaN(newPrice) || newPrice <= 0) {
            Alert.alert('Error', 'Ingrese un precio válido');
            return;
        }
        savePurchasePrice(newPrice);
    };

    // Función para alternar el análisis
    const toggleAnalysis = () => {
        saveShowAnalysis(!showAnalysis);
    };

    // Calcular análisis de ganancias
    const calculateAnalysis = () => {
        const sellPricePerBox = eggsPrice * 12; // Precio de venta por caja
        const profitPerBox = sellPricePerBox - purchasePrice; // Ganancia por caja
        const profitPerCarton = eggsPrice - (purchasePrice / 12); // Ganancia por cartón
        const profitPercentage = ((profitPerBox / purchasePrice) * 100); // Porcentaje de ganancia

        return {
            sellPricePerBox,
            profitPerBox,
            profitPerCarton,
            profitPercentage
        };
    };

    // Función para obtener la fecha actual en formato dd-mm-yy
    const getCurrentDate = () => {
        const date = new Date();
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${day}-${month}-${year}`;
    };

    // Función para convertir array de objetos a CSV
    const convertToCSV = (data) => {
        if (!data || data.length === 0) return '';

        // Definir el orden específico de las columnas
        const orderedHeaders = ['id', 'name', 'contact', 'quantity', 'address', 'status', 'latitude', 'longitude', 'createdAt'];

        // Crear la línea de encabezados
        const headers = orderedHeaders.join(',');

        // Procesar cada fila de datos
        const rows = data.map(obj => {
            return orderedHeaders.map(header => {
                let value = obj[header];

                // Manejar valores null, undefined o vacíos
                if (value === null || value === undefined) {
                    return '';
                }

                // Convertir a string
                let stringValue = String(value).trim();

                // Escapar comillas dobles duplicándolas y envolver en comillas si es necesario
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
                    stringValue = `"${stringValue.replace(/"/g, '""')}"`;
                }

                return stringValue;
            }).join(',');
        });

        return [headers, ...rows].join('\n');
    };

    // Función para exportar la base de clientes
    const exportClients = async () => {
        try {
            const clients = sale.clients || [];
            if (clients.length === 0) {
                Alert.alert('Advertencia', 'No hay clientes para exportar.');
                return;
            }

            // Incluir todos los campos necesarios, incluyendo createdAt
            const filteredClients = clients.map(({ photos, location, ...client }) => {
                return {
                    ...client,
                    createdAt: client.createdAt || new Date().toISOString(), // Incluir fecha de registro
                    latitude: location ? location.latitude : null,
                    longitude: location ? location.longitude : null,
                };
            });
            const csvContent = convertToCSV(filteredClients);
            const fileName = `hlr_base_clientes_${getCurrentDate()}.csv`;

            // Crear el archivo temporalmente
            const tempUri = `${FileSystem.documentDirectory}${fileName}`;
            await FileSystem.writeAsStringAsync(tempUri, csvContent, {
                encoding: FileSystem.EncodingType.UTF8
            });

            // Usar ShareAsync para permitir al usuario elegir dónde guardar
            await Sharing.shareAsync(tempUri, {
                mimeType: 'text/csv',
                dialogTitle: 'Guardar como hlr_base_clientes.csv',
                UTI: 'public.comma-separated-values-text'
            });

        } catch (error) {
            console.error('Error exportando base de clientes:', error);
            Alert.alert('Error', 'No se pudo exportar la base de clientes.');
        }
    };

    // Función para parsear CSV a array de objetos
    const parseCSV = (csv) => {
        const lines = csv.trim().split(/\r?\n/);
        if (lines.length < 2) {
            throw new Error('El archivo CSV debe tener al menos un encabezado y una fila de datos');
        }

        // Función auxiliar para parsear una línea CSV respetando comillas
        const parseCSVLine = (line) => {
            const result = [];
            let current = '';
            let inQuotes = false;
            let i = 0;

            while (i < line.length) {
                const char = line[i];

                if (char === '"') {
                    if (inQuotes && line[i + 1] === '"') {
                        // Comilla doble escapada
                        current += '"';
                        i += 2;
                    } else {
                        // Inicio o fin de campo entrecomillado
                        inQuotes = !inQuotes;
                        i++;
                    }
                } else if (char === ',' && !inQuotes) {
                    // Separador de campo
                    result.push(current);
                    current = '';
                    i++;
                } else {
                    current += char;
                    i++;
                }
            }

            result.push(current); // Agregar el último campo
            return result;
        };

        // Parsear encabezados
        const headers = parseCSVLine(lines[0]).map(header => header.trim());

        // Parsear datos
        return lines.slice(1).map(line => {
            if (!line.trim()) return null;

            const values = parseCSVLine(line);

            // Crear objeto cliente
            const client = headers.reduce((obj, header, index) => {
                let value = values[index] || '';
                value = value.trim();

                // Convertir valores vacíos a null
                if (value === '' || value === 'null' || value === 'undefined') {
                    obj[header] = null;
                } else if (header === 'quantity' || header === 'latitude' || header === 'longitude') {
                    // Convertir valores numéricos
                    const numValue = Number(value);
                    obj[header] = !isNaN(numValue) ? numValue : null;
                } else {
                    obj[header] = value;
                }

                return obj;
            }, {});

            // Formatear cliente con valores por defecto
            const formattedClient = {
                id: client.id || uuidv4(),
                name: client.name || "Cliente Sin Nombre",
                contact: client.contact ? String(client.contact) : "",
                quantity: client.quantity !== null && !isNaN(client.quantity) ? Number(client.quantity) : 0,
                location: null,
                address: client.address || "Ubicación no especificada",
                status: client.status || "pending",
                photos: [],
                createdAt: client.createdAt ? new Date(client.createdAt).toISOString() : new Date().toISOString(),
            };

            // Reconstruir location si hay coordenadas válidas
            if (client.latitude !== null && client.longitude !== null &&
                !isNaN(Number(client.latitude)) && !isNaN(Number(client.longitude))) {
                formattedClient.location = {
                    latitude: Number(client.latitude),
                    longitude: Number(client.longitude),
                };
            }

            return formattedClient;
        }).filter(client => client && client.name && client.name.trim().length > 0);
    };

    // Función para detectar duplicados
    const findDuplicates = (existing, newClients) => {
        return newClients.filter(newClient =>
            existing.some(existingClient =>
                (existingClient.name === newClient.name) ||
                (existingClient.contact && newClient.contact && existingClient.contact === newClient.contact) ||
                (existingClient.location && newClient.location &&
                    existingClient.location.latitude === newClient.location.latitude &&
                    existingClient.location.longitude === newClient.location.longitude)
            )
        );
    };

    // Función para cargar la base de clientes
    const importClients = async () => {
        try {
            // Permitir seleccionar cualquier tipo de archivo
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true
            });

            // Verificar si se canceló la selección
            if (result.canceled) {
                Alert.alert('Cancelado', 'No se seleccionó ningún archivo.');
                return;
            }

            // En versiones nuevas, result puede ser un array
            const selectedFile = Array.isArray(result.assets) ? result.assets[0] : result;

            // Verificar la extensión del archivo
            const fileName = selectedFile.name.toLowerCase();
            if (!fileName.endsWith('.csv')) {
                Alert.alert(
                    'Formato no válido',
                    'El archivo seleccionado no es un archivo CSV. Por favor, seleccione un archivo con extensión .csv'
                );
                return;
            }

            let fileContent;
            try {
                fileContent = await FileSystem.readAsStringAsync(selectedFile.uri, {
                    encoding: FileSystem.EncodingType.UTF8
                });
            } catch (readError) {
                console.error('Error leyendo el archivo:', readError);
                Alert.alert('Error', 'No se pudo leer el contenido del archivo. Verifique que sea un archivo válido.');
                return;
            }

            // Verificar que el archivo tenga contenido
            if (!fileContent || fileContent.trim().length === 0) {
                Alert.alert('Error', 'El archivo seleccionado está vacío.');
                return;
            }

            let parsedClients;
            try {
                parsedClients = parseCSV(fileContent);
            } catch (parseError) {
                console.error('Error analizando CSV:', parseError);
                Alert.alert('Error', 'El archivo no tiene un formato CSV válido o está corrupto.');
                return;
            }

            if (!parsedClients || parsedClients.length === 0) {
                Alert.alert('Error', 'El archivo no contiene clientes válidos o no corresponde a una base de datos de clientes de la App.');
                return;
            }

            // Validar que los clientes tengan la estructura esperada
            const validClients = parsedClients.filter(client =>
                client &&
                typeof client === 'object' &&
                client.id &&
                client.name &&
                typeof client.name === 'string' &&
                client.name.trim().length > 0
            );

            if (validClients.length === 0) {
                Alert.alert('Error', 'El archivo no contiene clientes con el formato válido esperado por la App.');
                return;
            }

            if (validClients.length !== parsedClients.length) {
                Alert.alert(
                    'Advertencia',
                    `Se encontraron ${parsedClients.length} registros, pero solo ${validClients.length} tienen el formato válido. ¿Desea continuar con los clientes válidos?`,
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Continuar',
                            onPress: () => processValidClients(validClients)
                        }
                    ]
                );
            } else {
                processValidClients(validClients);
            }

        } catch (error) {
            console.error('Error cargando base de clientes:', error);
            Alert.alert('Error', 'Ocurrió un error inesperado al cargar la base de clientes.');
        }
    };

    // Función auxiliar para procesar clientes válidos
    const processValidClients = (validClients) => {
        const existingClients = sale.clients || [];
        const duplicates = findDuplicates(existingClients, validClients);

        if (duplicates.length > 0) {
            Alert.alert(
                'Duplicados detectados',
                `Se encontraron ${duplicates.length} clientes duplicados. ¿Desea añadirlos de todas maneras?`,
                [
                    { text: 'No', style: 'cancel' },
                    {
                        text: 'Sí',
                        onPress: () => {
                            const newClients = [...existingClients, ...validClients];
                            updateSale({ ...sale, clients: newClients });
                            Alert.alert('Éxito', `Se han cargado ${validClients.length} clientes correctamente.`);
                        }
                    }
                ]
            );
        } else {
            const newClients = [...existingClients, ...validClients];
            updateSale({ ...sale, clients: newClients });
            Alert.alert('Éxito', `Se han cargado ${validClients.length} clientes correctamente.`);
        }
    };

    const analysis = calculateAnalysis();

    return (
        <View style={[styles.header, { paddingTop: insets.top + 15 }]}>
            {/* Contenedor izquierdo para el botón hamburguesa */}
            <View style={styles.leftContainer}>
                <TouchableOpacity style={styles.hamburgerButton} onPress={toggleSettings}>
                    <View style={styles.hamburgerLine} />
                    <View style={styles.hamburgerLine} />
                    <View style={styles.hamburgerLine} />
                </TouchableOpacity>
            </View>

            {/* Contenedor derecho para el título */}
            <View style={styles.rightContainer}>
                <Text style={styles.appTitle}>Vendedor App</Text>
            </View>

            {/* Modal de configuración */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={settingsVisible}
                onRequestClose={() => setSettingsVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <SafeAreaView style={styles.safeModalContainer}>
                        <View style={styles.settingsModalContent}>
                            {/* Header del modal con botón X - FIJO */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Configuración</Text>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={toggleSettings}
                                >
                                    <Text style={styles.closeButtonText}>×</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Contenido desplazable */}
                            <ScrollView
                                style={styles.scrollContainer}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={true}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Sección Precio de venta */}
                                <View style={styles.settingSection}>
                                    <Text style={styles.sectionTitle}>Precio de venta:</Text>

                                    {/* Botón para mostrar/ocultar opciones de precio */}
                                    <TouchableOpacity
                                        style={styles.priceButton}
                                        onPress={togglePriceMenu}
                                    >
                                        <Text style={styles.priceButtonText}>
                                            ${eggsPrice.toFixed(2)} {priceMenuVisible ? '▲' : '▼'}
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Submenú de opciones de precio */}
                                    {priceMenuVisible && (
                                        <View style={styles.priceOptionsContainer}>
                                            {priceOptions.map((price, index) => (
                                                <View key={index} style={styles.priceOptionRow}>
                                                    <TouchableOpacity
                                                        style={[
                                                            styles.priceOption,
                                                            eggsPrice === price && styles.selectedPriceOption
                                                        ]}
                                                        onPress={() => selectPrice(price)}
                                                    >
                                                        <Text style={[
                                                            styles.priceOptionText,
                                                            eggsPrice === price && styles.selectedPriceOptionText
                                                        ]}>
                                                            ${price.toFixed(2)}
                                                        </Text>
                                                    </TouchableOpacity>

                                                    {/* Botón X para eliminar opción */}
                                                    <TouchableOpacity
                                                        style={styles.removeButton}
                                                        onPress={() => removePriceOption(price)}
                                                    >
                                                        <Text style={styles.removeButtonText}>×</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ))}

                                            {/* Botón para agregar nueva opción */}
                                            {!showAddPrice ? (
                                                <TouchableOpacity
                                                    style={styles.addPriceButton}
                                                    onPress={() => setShowAddPrice(true)}
                                                >
                                                    <Text style={styles.addPriceButtonText}>+ Agregar precio</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={styles.addPriceContainer}>
                                                    <TextInput
                                                        style={styles.newPriceInput}
                                                        value={newPriceInput}
                                                        onChangeText={setNewPriceInput}
                                                        placeholder="Nuevo precio"
                                                        placeholderTextColor={COLORS.textSecondary}
                                                        keyboardType="numeric"
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.confirmAddButton}
                                                        onPress={addPriceOption}
                                                    >
                                                        <Text style={styles.confirmAddButtonText}>✓</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={styles.cancelAddButton}
                                                        onPress={() => {
                                                            setShowAddPrice(false);
                                                            setNewPriceInput('');
                                                        }}
                                                    >
                                                        <Text style={styles.cancelAddButtonText}>×</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    )}

                                    {/* Precio por caja calculado */}
                                    <View style={styles.calculatedContainer}>
                                        <Text style={styles.calculatedLabel}>Precio por caja:</Text>
                                        <Text style={styles.calculatedPrice}>
                                            ${(eggsPrice * 12).toFixed(2)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Sección Parámetros de REV */}
                                <View style={styles.settingSection}>
                                    <Text style={styles.sectionTitle}>Parámetros de REV:</Text>

                                    {/* Precio de compra */}
                                    <View style={styles.purchasePriceContainer}>
                                        <Text style={styles.purchasePriceLabel}>Precio de adquisición por caja:</Text>
                                        <View style={styles.purchasePriceInputContainer}>
                                            <Text style={styles.dollarSign}>$</Text>
                                            <TextInput
                                                style={styles.purchasePriceInput}
                                                value={purchasePriceInput}
                                                onChangeText={setPurchasePriceInput}
                                                onBlur={updatePurchasePrice}
                                                keyboardType="numeric"
                                                placeholder="0.00"
                                                placeholderTextColor={COLORS.textSecondary}
                                            />
                                        </View>
                                    </View>

                                    {/* Switch para mostrar análisis */}
                                    <View style={styles.switchContainer}>
                                        <Text style={styles.switchLabel}>Mostrar análisis</Text>
                                        <TouchableOpacity
                                            style={[styles.switch, showAnalysis && styles.switchActive]}
                                            onPress={toggleAnalysis}
                                        >
                                            <View style={[styles.switchThumb, showAnalysis && styles.switchThumbActive]} />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Área de análisis condicional */}
                                    {showAnalysis && (
                                        <View style={styles.analysisContainer}>
                                            <View style={styles.analysisHeader}>
                                                <Text style={styles.analysisTitle}>Análisis de Rentabilidad</Text>
                                            </View>

                                            <View style={styles.analysisContent}>
                                                <View style={styles.analysisRow}>
                                                    <Text style={styles.analysisLabel}>Ganancia por caja:</Text>
                                                    <Text style={[styles.analysisValue, analysis.profitPerBox >= 0 ? styles.profitPositive : styles.profitNegative]}>
                                                        ${analysis.profitPerBox.toFixed(2)}
                                                    </Text>
                                                </View>

                                                <View style={styles.analysisRow}>
                                                    <Text style={styles.analysisLabel}>Ganancia por cartón:</Text>
                                                    <Text style={[styles.analysisValue, analysis.profitPerCarton >= 0 ? styles.profitPositive : styles.profitNegative]}>
                                                        ${analysis.profitPerCarton.toFixed(2)}
                                                    </Text>
                                                </View>

                                                <View style={styles.analysisRow}>
                                                    <Text style={styles.analysisLabel}>Margen de ganancia:</Text>
                                                    <Text style={[styles.analysisValue, styles.percentageValue, analysis.profitPercentage >= 0 ? styles.profitPositive : styles.profitNegative]}>
                                                        {analysis.profitPercentage.toFixed(1)}%
                                                    </Text>
                                                </View>

                                                <View style={[styles.analysisRow, styles.totalRow]}>
                                                    <Text style={styles.analysisLabelTotal}>Precio venta por caja:</Text>
                                                    <Text style={styles.analysisValueTotal}>
                                                        ${analysis.sellPricePerBox.toFixed(2)}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Sección Sincronización */}
                                <View style={styles.settingSection}>
                                    <Text style={styles.sectionTitle}>Sincronización:</Text>
                                    <TouchableOpacity
                                        style={styles.syncButton}
                                        onPress={() => setExportModalVisible(true)}
                                    >
                                        <Text style={styles.syncButtonText}>Ruta - Exportar base de clientes</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.syncButton}
                                        onPress={() => setImportModalVisible(true)}
                                    >
                                        <Text style={styles.syncButtonText}>Ruta - Cargar base de clientes</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Espacio adicional al final para mejor UX */}
                                <View style={styles.bottomSpacing} />
                            </ScrollView>
                        </View>
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Modal de confirmación para exportar */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={exportModalVisible}
                onRequestClose={() => setExportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.syncModalContent}>
                        {/* Header del modal */}
                        <View style={styles.syncModalHeader}>
                            <View style={styles.iconContainer}>
                                <Text style={styles.modalIcon}>📤</Text>
                            </View>
                            <Text style={styles.syncModalTitle}>Exportar Base de Clientes</Text>
                        </View>

                        {/* Contenido del modal */}
                        <View style={styles.syncModalBody}>
                            <Text style={styles.syncModalDescription}>
                                Está a punto de exportar toda la información de sus clientes, incluyendo:
                            </Text>

                            <View style={styles.infoList}>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoText}>Nombres y contactos</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoText}>Números telefónicos</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoText}>Ubicaciones GPS</Text>
                                </View>
                                <View style={styles.infoItem}>
                                    <Text style={styles.infoBullet}>•</Text>
                                    <Text style={styles.infoText}>Historial de ventas</Text>
                                </View>
                            </View>

                            <View style={styles.warningContainer}>
                                <Text style={styles.warningIcon}>⚠️</Text>
                                <Text style={styles.warningText}>
                                    Esta información es sensible. Asegúrese de compartirla de forma segura.
                                </Text>
                            </View>
                        </View>

                        {/* Botones del modal */}
                        <View style={styles.syncModalButtons}>
                            <TouchableOpacity
                                style={[styles.syncModalButton, styles.cancelSyncButton]}
                                onPress={() => setExportModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.syncModalButton, styles.exportButton]}
                                onPress={() => {
                                    setExportModalVisible(false);
                                    exportClients();
                                }}
                            >
                                <Text style={styles.exportButtonText}>Exportar</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal para cargar base de clientes */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={importModalVisible}
                onRequestClose={() => setImportModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.syncModalContent}>
                        {/* Header del modal */}
                        <View style={styles.syncModalHeader}>
                            <View style={styles.iconContainer}>
                                <Text style={styles.modalIcon}>📥</Text>
                            </View>
                            <Text style={styles.syncModalTitle}>Cargar Base de Clientes</Text>
                        </View>

                        {/* Contenido del modal */}
                        <View style={styles.syncModalBody}>
                            <Text style={styles.syncModalDescription}>
                                Seleccione un archivo CSV con la base de clientes a importar.
                            </Text>

                            <View style={styles.formatContainer}>
                                <Text style={styles.formatTitle}>Formato esperado:</Text>
                                <View style={styles.formatExample}>
                                    <Text style={styles.formatText}>hlr_base_clientes_DD-MM-AA.csv</Text>
                                </View>
                            </View>

                            <View style={styles.infoContainer}>
                                <Text style={styles.infoIcon}>ℹ️</Text>
                                <Text style={styles.infoDescription}>
                                    El sistema detectará automáticamente duplicados y le permitirá decidir qué hacer con ellos.
                                </Text>
                            </View>
                        </View>

                        {/* Botones del modal */}
                        <View style={styles.syncModalButtons}>
                            <TouchableOpacity
                                style={[styles.syncModalButton, styles.cancelSyncButton]}
                                onPress={() => setImportModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.syncModalButton, styles.importButton]}
                                onPress={() => {
                                    setImportModalVisible(false);
                                    importClients();
                                }}
                            >
                                <Text style={styles.importButtonText}>Seleccionar Archivo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    // Estilos del header principal
    header: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 15,
        paddingHorizontal: 20,
        elevation: 4,
    },
    leftContainer: {
        flex: 0,
        alignItems: 'flex-start',
    },
    rightContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    appTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },

    // Estilos del botón hamburguesa
    hamburgerButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: COLORS.accent,
        width: 44,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hamburgerLine: {
        width: 20,
        height: 2.5,
        backgroundColor: COLORS.text,
        marginVertical: 1.5,
        borderRadius: 1.25,
    },

    // Estilos del modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    safeModalContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingsModalContent: {
        width: '85%',
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.textSecondary + '30',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    closeButton: {
        backgroundColor: COLORS.error || '#FF6B6B',
        borderRadius: 20,
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
    },
    closeButtonText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        lineHeight: 22,
    },

    // Estilos de las secciones de configuración
    settingSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },

    // Estilos del botón de precio
    priceButton: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    priceButtonText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '600',
    },

    // Estilos del contenedor de opciones de precio
    priceOptionsContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 8,
        marginBottom: 12,
    },
    priceOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    priceOption: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 6,
        padding: 10,
        marginRight: 8,
    },
    selectedPriceOption: {
        backgroundColor: COLORS.accent,
    },
    priceOptionText: {
        fontSize: 15,
        color: COLORS.text,
        textAlign: 'center',
    },
    selectedPriceOptionText: {
        fontWeight: 'bold',
    },
    removeButton: {
        backgroundColor: COLORS.error || '#FF6B6B',
        borderRadius: 15,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        lineHeight: 18,
    },

    // Estilos para agregar precio
    addPriceButton: {
        backgroundColor: COLORS.success,
        borderRadius: 6,
        padding: 10,
        alignItems: 'center',
        marginTop: 6,
    },
    addPriceButtonText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '600',
    },
    addPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    newPriceInput: {
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 6,
        padding: 10,
        marginRight: 8,
        color: COLORS.text,
        fontSize: 15,
    },
    confirmAddButton: {
        backgroundColor: COLORS.success,
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 6,
    },
    confirmAddButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelAddButton: {
        backgroundColor: COLORS.error || '#FF6B6B',
        borderRadius: 15,
        width: 30,
        height: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cancelAddButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 20,
    },

    // Estilos del precio calculado
    calculatedContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    calculatedLabel: {
        fontSize: 15,
        color: COLORS.textSecondary,
    },
    calculatedPrice: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: 'bold',
    },
    purchasePriceContainer: {
        marginBottom: 16,
    },
    purchasePriceLabel: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 8,
        fontWeight: '500',
    },
    purchasePriceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 12,
    },
    dollarSign: {
        fontSize: 16,
        color: COLORS.secondary,
        fontWeight: 'bold',
        marginRight: 5,
    },
    purchasePriceInput: {
        flex: 1,
        padding: 12,
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 8,
    },
    switchLabel: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
        flex: 1,
    },
    switch: {
        width: 50,
        height: 28,
        borderRadius: 14,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        paddingHorizontal: 2,
    },
    switchActive: {
        backgroundColor: COLORS.accent,
    },
    switchThumb: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: COLORS.text,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
        elevation: 3,
    },
    switchThumbActive: {
        transform: [{ translateX: 22 }],
    },
    analysisContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.accent + '30',
    },
    analysisHeader: {
        backgroundColor: COLORS.accent,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    analysisTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
    },
    analysisContent: {
        padding: 16,
    },
    analysisRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: COLORS.card,
        borderRadius: 8,
    },
    totalRow: {
        backgroundColor: COLORS.primary + '20',
        borderWidth: 1,
        borderColor: COLORS.primary + '40',
        marginTop: 8,
    },
    analysisLabel: {
        fontSize: 14,
        color: COLORS.text,
        flex: 1,
        fontWeight: '500',
    },
    analysisLabelTotal: {
        fontSize: 14,
        color: COLORS.text,
        flex: 1,
        fontWeight: 'bold',
    },
    analysisValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    analysisValueTotal: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    percentageValue: {
        fontSize: 15,
    },
    profitPositive: {
        color: COLORS.success,
    },
    profitNegative: {
        color: COLORS.error,
    },
    syncButton: {
        backgroundColor: COLORS.secondary,
        padding: 10,
        borderRadius: 5,
        marginVertical: 5,
        alignItems: 'center',
    },
    syncButtonText: {
        color: COLORS.white,
        fontSize: 16,
    },
    confirmModalContent: {
        backgroundColor: COLORS.white,
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    confirmModalText: {
        fontSize: 16,
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    confirmModalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    importModalContent: {
        backgroundColor: COLORS.white,
        padding: 20,
        borderRadius: 10,
        width: '80%',
        alignItems: 'center',
    },
    importModalText: {
        fontSize: 16,
        color: COLORS.text,
        marginBottom: 20,
        textAlign: 'center',
    },
    modalButton: {
        padding: 10,
        borderRadius: 5,
        width: '45%',
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.error,
    },
    confirmButton: {
        backgroundColor: COLORS.success,
    },
    addButton: {
        backgroundColor: COLORS.accent,
        marginBottom: 10,
    },
    modalButtonText: {
        color: COLORS.white,
        fontSize: 16,
    },
    syncModalContent: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        width: '90%',
        maxWidth: 400,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    syncModalHeader: {
        backgroundColor: COLORS.primary,
        paddingVertical: 20,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border + '40',
    },
    iconContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 30,
        width: 60,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalIcon: {
        fontSize: 28,
    },
    syncModalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
    },
    syncModalBody: {
        padding: 24,
    },
    syncModalDescription: {
        fontSize: 15,
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    infoList: {
        marginBottom: 20,
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 12,
    },
    infoBullet: {
        fontSize: 16,
        color: COLORS.accent,
        marginRight: 10,
        fontWeight: 'bold',
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        flex: 1,
    },
    warningContainer: {
        backgroundColor: COLORS.warning + '20',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
    },
    warningIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    warningText: {
        fontSize: 13,
        color: COLORS.text,
        flex: 1,
        lineHeight: 18,
    },
    formatContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 16,
        marginBottom: 20,
    },
    formatTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    formatExample: {
        backgroundColor: COLORS.primary + '20',
        borderRadius: 6,
        padding: 8,
        alignItems: 'center',
    },
    formatText: {
        fontSize: 13,
        fontFamily: 'monospace',
        color: COLORS.accent,
        fontWeight: '500',
    },
    infoContainer: {
        backgroundColor: COLORS.accent + '15',
        borderRadius: 8,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: COLORS.accent,
    },
    infoIcon: {
        fontSize: 18,
        marginRight: 8,
    },
    infoDescription: {
        fontSize: 13,
        color: COLORS.text,
        flex: 1,
        lineHeight: 18,
    },
    syncModalButtons: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: COLORS.border + '40',
    },
    syncModalButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelSyncButton: {
        backgroundColor: COLORS.background,
        borderRightWidth: 1,
        borderRightColor: COLORS.border + '40',
    },
    exportButton: {
        backgroundColor: COLORS.secondary,
    },
    importButton: {
        backgroundColor: COLORS.accent,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    exportButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    importButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
});

export default Header;