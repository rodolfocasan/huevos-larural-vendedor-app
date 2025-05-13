// Components/Home/SalesContainer.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, FlatList, Alert } from 'react-native';

import { COLORS, formatTime, formatDate, BILLS, EXPENSE_TYPES } from '../Utils/Constants';

import SaleCalculator from './SaleCalculator';
import TransactionsList from './TransactionsList';





// Componente para manejar la interfaz de ventas, historial y gastos
const SalesContainer = ({ sale, updateSale, eggsPrice, locations, currentLocation, setCurrentLocation, addLocation }) => {
    const [activeTab, setActiveTab] = useState('sales'); // Estado para la pestaña activa: 'sales', 'history', 'expenses'
    const [expenseModalVisible, setExpenseModalVisible] = useState(false); // Estado para la visibilidad del modal de gastos
    const [expenseAmount, setExpenseAmount] = useState(''); // Estado para el monto del gasto
    const [expenseDescription, setExpenseDescription] = useState('Gasolina'); // Estado para la descripción del gasto
    const [showFunds, setShowFunds] = useState(false); // Estado para mostrar u ocultar los fondos
    const [newLocationModalVisible, setNewLocationModalVisible] = useState(false); // Estado para el modal de nueva ubicación
    const [newLocationName, setNewLocationName] = useState(''); // Estado para el nombre de la nueva ubicación

    // Verificación si la venta está cargada
    if (!sale) {
        return (
            <View style={styles.container}>
                <Text style={styles.loadingText}>Cargando ventas...</Text>
            </View>
        );
    }

    // Calcular el fondo monetario total
    const calculateTotalFunds = () => {
        // Total de ventas
        const totalSales = sale.transactions.reduce((sum, transaction) => sum + transaction.total, 0);

        // Total de gastos
        const totalExpenses = sale.expenses.reduce((sum, expense) => sum + expense.amount, 0);

        // Total de cambio dado (comentado, no borrar)
        // const totalChange = sale.transactions.reduce((sum, transaction) => sum + transaction.change, 0);

        // Fondo monetario total
        return totalSales - totalExpenses;
    };

    // Función para mostrar el modal de confirmación mostrar los fondos
    const confirmShowFunds = () => {
        Alert.alert(
            "Confirmar",
            "¿Desea mostrar el fondo disponible?",
            [
                {
                    text: "Cancelar",
                    style: "cancel"
                },
                {
                    text: "OK",
                    onPress: () => setShowFunds(true)
                }
            ]
        );
    };

    // Función para agregar una nueva transacción a la venta
    const addTransaction = (transaction) => {
        const updatedSale = {
            ...sale,
            transactions: [...sale.transactions, {
                ...transaction,
                id: Date.now().toString(),
                timestamp: new Date().toISOString(),
                location: currentLocation, // Añadir la ubicación actual a la transacción
            }],
        };
        updateSale(updatedSale);
    };

    // Función para agregar un nuevo gasto
    const addExpense = () => {
        if (!expenseAmount || isNaN(parseFloat(expenseAmount)) || parseFloat(expenseAmount) <= 0) {
            return;
        }

        const newExpense = {
            id: Date.now().toString(),
            amount: parseFloat(expenseAmount),
            description: expenseDescription,
            timestamp: new Date().toISOString(),
        };

        const updatedSale = {
            ...sale,
            expenses: [...sale.expenses, newExpense],
        };

        updateSale(updatedSale);
        setExpenseModalVisible(false);
        setExpenseAmount('');
        setExpenseDescription('Gasolina');
    };

    // Renderizado del modal para registrar gastos
    const renderExpenseModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={expenseModalVisible}
            onRequestClose={() => setExpenseModalVisible(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setExpenseModalVisible(false)}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Registrar Gasto</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Monto ($):</Text>
                        <TextInput
                            style={styles.input}
                            value={expenseAmount}
                            onChangeText={setExpenseAmount}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    <Text style={styles.inputLabel}>Descripción:</Text>
                    <FlatList
                        data={EXPENSE_TYPES}
                        horizontal={false}
                        keyExtractor={(item) => item}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.expenseTypeItem,
                                    expenseDescription === item && styles.selectedExpenseType,
                                ]}
                                onPress={() => setExpenseDescription(item)}
                            >
                                <Text
                                    style={[
                                        styles.expenseTypeText,
                                        expenseDescription === item && styles.selectedExpenseTypeText,
                                    ]}
                                >
                                    {item}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />

                    <View style={styles.modalButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setExpenseModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.addButton]}
                            onPress={addExpense}
                        >
                            <Text style={styles.modalButtonText}>Registrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // Renderizado del modal para añadir o seleccionar ubicación
    const renderLocationModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={newLocationModalVisible}
            onRequestClose={() => setNewLocationModalVisible(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setNewLocationModalVisible(false)}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Ubicación de Venta</Text>

                    {/* Lista de ubicaciones existentes */}
                    <ScrollView style={styles.locationsList}>
                        {locations.map((location, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.locationItem,
                                    currentLocation === location && styles.selectedLocationItem,
                                ]}
                                onPress={() => {
                                    setCurrentLocation(location);
                                    setNewLocationModalVisible(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.locationItemText,
                                        currentLocation === location && styles.selectedLocationItemText,
                                    ]}
                                >
                                    {location}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Campo para añadir nueva ubicación */}
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Añadir nueva:</Text>
                        <TextInput
                            style={styles.input}
                            value={newLocationName}
                            onChangeText={setNewLocationName}
                            placeholder="Nombre de ubicación"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>

                    <View style={styles.modalButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setNewLocationModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                styles.addButton,
                                !newLocationName && styles.disabledButton,
                            ]}
                            onPress={() => {
                                if (newLocationName) {
                                    addLocation(newLocationName);
                                    setCurrentLocation(newLocationName);
                                    setNewLocationName('');
                                    setNewLocationModalVisible(false);
                                }
                            }}
                            disabled={!newLocationName}
                        >
                            <Text style={styles.modalButtonText}>Añadir</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    return (
        <View style={styles.container}>
            {/* Indicador de fondos totales */}
            <View style={styles.fundsContainer}>
                <Text style={styles.fundsText}>
                    {showFunds ? `$${calculateTotalFunds().toFixed(2)}` : "$****.**"}
                </Text>
                <TouchableOpacity onPress={() => {
                    if (showFunds) {
                        setShowFunds(false);
                    } else {
                        confirmShowFunds();
                    }
                }}>
                    <Text style={styles.eyeIcon}>{showFunds ? "👁️" : "👁️‍🗨️"}</Text>
                </TouchableOpacity>
            </View>

            {/* Navegación de pestañas */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'sales' && styles.activeTab]}
                    onPress={() => setActiveTab('sales')}
                >
                    <Text style={[styles.tabText, activeTab === 'sales' && styles.activeTabText]}>
                        Ventas
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'expenses' && styles.activeTab]}
                    onPress={() => setActiveTab('expenses')}
                >
                    <Text style={[styles.tabText, activeTab === 'expenses' && styles.activeTabText]}>
                        Gastos
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                        Historial
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Contenido de la pestaña activa */}
            <View style={styles.tabContent}>
                {activeTab === 'sales' && (
                    <>
                        <View style={styles.locationContainer}>
                            <Text style={styles.locationLabel}>Ubicación de venta:</Text>
                            <View style={styles.locationSelectorContainer}>
                                <View style={styles.dropdownContainer}>
                                    {locations.length > 0 ? (
                                        <TouchableOpacity
                                            style={styles.locationPicker}
                                            onPress={() => setNewLocationModalVisible(true)}
                                        >
                                            <Text style={styles.locationPickerText}>{currentLocation}</Text>
                                            <Text style={styles.dropdownIcon}>▼</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={styles.noLocationsText}>No hay ubicaciones</Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.addLocationButton}
                                    onPress={() => {
                                        setNewLocationName('');
                                        setNewLocationModalVisible(true);
                                    }}
                                >
                                    <Text style={styles.addLocationButtonText}>(+) Añadir ubicación</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <SaleCalculator
                            onSaveTransaction={addTransaction}
                            eggsPrice={eggsPrice}
                            currentLocation={currentLocation}
                        />
                    </>
                )}

                {activeTab === 'history' && (
                    <TransactionsList transactions={sale.transactions} sale={sale} />
                )}

                {activeTab === 'expenses' && (
                    <View style={styles.expensesContainer}>
                        <TouchableOpacity
                            style={styles.addExpenseButton}
                            onPress={() => setExpenseModalVisible(true)}
                        >
                            <Text style={styles.addExpenseButtonText}>(+) Gasto propio</Text>
                        </TouchableOpacity>

                        <ScrollView style={styles.expensesList}>
                            {sale.expenses.length === 0 ? (
                                <Text style={styles.noDataText}>No hay gastos registrados</Text>
                            ) : (
                                sale.expenses.map((expense) => (
                                    <View key={expense.id} style={styles.expenseItem}>
                                        <View style={styles.expenseDetails}>
                                            <Text style={styles.expenseDescription}>{expense.description}</Text>
                                            <Text style={styles.expenseTimestamp}>
                                                {formatDate(expense.timestamp)} {formatTime(expense.timestamp)}
                                            </Text>
                                        </View>
                                        <Text style={styles.expenseAmount}>
                                            ${expense.amount.toFixed(2)}
                                        </Text>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {sale.expenses.length > 0 && (
                            <View style={styles.totalContainer}>
                                <Text style={styles.totalLabel}>Total Gastos:</Text>
                                <Text style={styles.totalAmount}>
                                    ${sale.expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>

            {renderExpenseModal()}
            {renderLocationModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingText: {
        color: COLORS.text,
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
    },
    fundsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        borderRadius: 5,
        margin: 10,
        marginBottom: 5,
        padding: 10,
    },
    fundsText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    eyeIcon: {
        fontSize: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.card,
        borderRadius: 5,
        margin: 10,
        marginTop: 5,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: COLORS.accent,
    },
    tabText: {
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    activeTabText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
    tabContent: {
        flex: 1,
        padding: 10,
    },
    expensesContainer: {
        flex: 1,
    },
    addExpenseButton: {
        backgroundColor: COLORS.accent,
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
    },
    addExpenseButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
    expensesList: {
        flex: 1,
    },
    expenseItem: {
        backgroundColor: COLORS.card,
        borderRadius: 5,
        padding: 15,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    expenseDetails: {
        flex: 1,
    },
    expenseDescription: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
    expenseTimestamp: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 5,
    },
    expenseAmount: {
        color: COLORS.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 5,
        marginTop: 10,
    },
    totalLabel: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    totalAmount: {
        color: COLORS.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
    noDataText: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 20,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
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
    inputContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        color: COLORS.text,
        fontSize: 16,
        marginBottom: 5,
    },
    input: {
        backgroundColor: COLORS.background,
        color: COLORS.text,
        borderRadius: 5,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    expenseTypeItem: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 5,
        marginBottom: 5,
    },
    selectedExpenseType: {
        backgroundColor: COLORS.accent,
    },
    expenseTypeText: {
        color: COLORS.text,
    },
    selectedExpenseTypeText: {
        fontWeight: 'bold',
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 5,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: COLORS.error,
        marginRight: 5,
    },
    addButton: {
        backgroundColor: COLORS.success,
        marginLeft: 5,
    },
    modalButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
    locationContainer: {
        padding: 10,
        backgroundColor: COLORS.card,
        borderRadius: 8,
        marginBottom: 10,
    },
    locationLabel: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    locationSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dropdownContainer: {
        flex: 1,
        marginRight: 8,
    },
    locationPicker: {
        backgroundColor: COLORS.primary,
        borderRadius: 4,
        padding: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    locationPickerText: {
        color: COLORS.text,
        fontSize: 14,
    },
    dropdownIcon: {
        color: COLORS.text,
        fontSize: 12,
    },
    noLocationsText: {
        color: COLORS.textSecondary,
        padding: 8,
    },
    addLocationButton: {
        backgroundColor: COLORS.accent,
        borderRadius: 4,
        padding: 8,
    },
    addLocationButtonText: {
        color: COLORS.text,
        fontSize: 14,
    },
    locationsList: {
        maxHeight: 150,
        marginBottom: 10,
    },
    locationItem: {
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    selectedLocationItem: {
        backgroundColor: COLORS.accent,
    },
    locationItemText: {
        color: COLORS.text,
        fontSize: 14,
    },
    selectedLocationItemText: {
        fontWeight: 'bold',
    },
});

export default SalesContainer;