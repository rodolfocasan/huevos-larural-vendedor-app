// Components/Home/Header.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, SafeAreaView, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS } from '../Utils/Constants';





// Componente Header que maneja el encabezado de la aplicación
const Header = ({ eggsPrice, saveEggsPrice }) => {
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
                            {/* Header del modal con botón X */}
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Configuración</Text>
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={toggleSettings}
                                >
                                    <Text style={styles.closeButtonText}>×</Text>
                                </TouchableOpacity>
                            </View>

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
                        </View>
                    </SafeAreaView>
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
});

export default Header;