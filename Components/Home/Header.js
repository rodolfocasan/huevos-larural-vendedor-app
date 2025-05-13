// Components/Home/Header.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, FlatList, Platform, SafeAreaView } from 'react-native';

import { COLORS } from '../Utils/Constants';





// Componente Header que maneja el encabezado de la aplicación
const Header = ({ sales, currentSaleId, setCurrentSaleId, createNewSale, eggsPrice, saveEggsPrice }) => {
    // Estado para controlar la visibilidad del menú de ventas
    const [menuVisible, setMenuVisible] = useState(false);

    // Estado para controlar la visibilidad del modal de configuración
    const [settingsVisible, setSettingsVisible] = useState(false);

    // Estado temporal para el precio de los cartones de huevos
    const [tempEggsPrice, setTempEggsPrice] = useState(eggsPrice.toString());

    // Función para alternar la visibilidad del menú de ventas
    const toggleMenu = () => setMenuVisible(!menuVisible);

    // Función para alternar la visibilidad del modal de configuración
    const toggleSettings = () => {
        setSettingsVisible(!settingsVisible);
        if (settingsVisible) {
            setTempEggsPrice(eggsPrice.toString());
        }
    };

    // Función para guardar el nuevo precio de los cartones de huevos
    const handleSavePrice = () => {
        const newPrice = parseFloat(tempEggsPrice);
        if (!isNaN(newPrice) && newPrice > 0) {
            saveEggsPrice(newPrice);
        }
        toggleSettings();
    };

    // Obtener el nombre de la venta actual
    const currentSaleName = sales.find(sale => sale.id === currentSaleId)?.name || 'Cargando...';

    return (
        <View style={styles.header}>
            {/* Contenedor izquierdo para el botón de configuración */}
            <View style={styles.leftContainer}>
                {/* Botón para abrir el modal de configuración */}
                <TouchableOpacity style={styles.settingsButton} onPress={toggleSettings}>
                    <Text style={styles.settingsIcon}>Precio</Text>
                </TouchableOpacity>
            </View>

            {/* Contenedor derecho para el menú de ventas */}
            <View style={styles.rightContainer}>
                {/* Botón para abrir el menú de ventas */}
                <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
                    <Text style={styles.currentSaleName}>{currentSaleName} ▼</Text>
                </TouchableOpacity>
            </View>

            {/* Modal del menú de ventas */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={menuVisible}
                onRequestClose={() => setMenuVisible(false)}
            >
                {/* Overlay para cerrar el modal al tocar fuera */}
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setMenuVisible(false)}
                >
                    {/* Contenido del modal */}
                    <SafeAreaView style={styles.safeModalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Ventas</Text>
                            {/* Lista de ventas disponibles */}
                            <FlatList
                                data={sales}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    /* Elemento de la lista para cada venta */
                                    <TouchableOpacity
                                        style={[
                                            styles.saleItem,
                                            currentSaleId === item.id && styles.selectedSaleItem,
                                        ]}
                                        onPress={() => {
                                            setCurrentSaleId(item.id);
                                            setMenuVisible(false);
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.saleItemText,
                                                currentSaleId === item.id && styles.selectedSaleItemText,
                                            ]}
                                        >
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            />
                            {/* Botón para crear una nueva venta */}
                            <TouchableOpacity
                                style={styles.newSaleButton}
                                onPress={() => {
                                    createNewSale();
                                    setMenuVisible(false);
                                }}
                            >
                                <Text style={styles.newSaleButtonText}>(+) Nueva venta</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </TouchableOpacity>
            </Modal>

            {/* Modal de configuración */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={settingsVisible}
                onRequestClose={() => setSettingsVisible(false)}
            >
                {/* Overlay para cerrar el modal al tocar fuera */}
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setSettingsVisible(false)}
                >
                    {/* Contenido del modal de configuración */}
                    <SafeAreaView style={styles.safeModalContainer}>
                        <View style={styles.settingsModalContent}>
                            <Text style={styles.modalTitle}>Configuración</Text>

                            {/* Campo para editar el precio por cartón */}
                            <View style={styles.settingItem}>
                                <Text style={styles.settingLabel}>Precio por cartón ($):</Text>
                                <TextInput
                                    style={styles.priceInput}
                                    value={tempEggsPrice}
                                    onChangeText={setTempEggsPrice}
                                    keyboardType="numeric"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>

                            {/* Campo calculado para el precio por caja */}
                            <View style={styles.settingItem}>
                                <Text style={styles.settingLabel}>Precio por caja ($):</Text>
                                <Text style={styles.calculatedPrice}>
                                    ${(parseFloat(tempEggsPrice) * 12).toFixed(2)}
                                </Text>
                            </View>

                            {/* Botón para guardar los cambios */}
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={handleSavePrice}
                            >
                                <Text style={styles.saveButtonText}>Guardar</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        elevation: 4,
        // Asegurar que el header tenga una altura adecuada para evitar problemas con el notch
        paddingTop: Platform.OS === 'ios' ? 10 : 15,
    },
    leftContainer: {
        flex: 0,
        alignItems: 'flex-start',
    },
    rightContainer: {
        flex: 1,
        alignItems: 'flex-end',
    },
    menuButton: {
        padding: 10,
        borderRadius: 25,
        backgroundColor: COLORS.accent,
        paddingHorizontal: 20,
        height: 40,
        justifyContent: 'center',
    },
    currentSaleName: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '800',
    },
    settingsButton: {
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 5,
        backgroundColor: COLORS.accent,
        height: 40,
        justifyContent: 'center',
    },
    settingsIcon: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: 'bold',
    },
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
    modalContent: {
        width: '80%',
        backgroundColor: COLORS.card,
        borderRadius: 10,
        padding: 20,
        maxHeight: '70%',
    },
    settingsModalContent: {
        width: '80%',
        backgroundColor: COLORS.card,
        borderRadius: 10,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
        textAlign: 'center',
    },
    saleItem: {
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginBottom: 5,
    },
    selectedSaleItem: {
        backgroundColor: COLORS.accent,
    },
    saleItemText: {
        color: COLORS.text,
        fontSize: 16,
    },
    selectedSaleItemText: {
        fontWeight: 'bold',
    },
    newSaleButton: {
        marginTop: 10,
        backgroundColor: COLORS.success,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    newSaleButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    settingLabel: {
        color: COLORS.text,
        fontSize: 16,
        flex: 1,
    },
    priceInput: {
        backgroundColor: COLORS.background,
        color: COLORS.text,
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 8,
        width: 100,
        textAlign: 'right',
    },
    calculatedPrice: {
        color: COLORS.text,
        fontSize: 16,
        width: 100,
        textAlign: 'right',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: COLORS.success,
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
});

export default Header;