// Components/Home/SaleCalculator.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';

import { COLORS, BILLS } from '../Utils/Constants';





// Componente para manejar la calculadora de ventas
const SaleCalculator = ({ onSaveTransaction, eggsPrice, currentLocation }) => {
    const [saleType, setSaleType] = useState('carton'); // Estado para el tipo de venta: 'Cartón', 'Medio Cartón' o 'Caja'
    const [ventaCompleta, setVentaCompleta] = useState(true); // Estado para controlar si es venta completa o dividida
    const [quantity, setQuantity] = useState(0); // Estado para la cantidad de unidades a vender
    const [receivedMoney, setReceivedMoney] = useState({}); // Estado para el dinero recibido, organizado por denominación de billetes
    const [step, setStep] = useState('quantity'); // Estado para la etapa actual del proceso: 'quantity', 'payment', 'result'
    const [total, setTotal] = useState(0); // Estado para el total de la venta
    const [change, setChange] = useState(0); // Estado para el cambio a devolver
    const [totalReceived, setTotalReceived] = useState(0); // Estado para el total de dinero recibido

    // Si el usuario selecciona "Venta Dividida" y después vuelve a "Venta Completa", se necesita volver al estado correcto de saleType
    useEffect(() => {
        if (ventaCompleta) {
            if (saleType === 'half_carton') {
                setSaleType('carton');
            }
        } else {
            setSaleType('half_carton');
        }
    }, [ventaCompleta]);

    // Efecto para calcular el total basado en la cantidad y el tipo de venta
    useEffect(() => {
        let unitPrice;
        if (saleType === 'carton') {
            unitPrice = eggsPrice;
        } else if (saleType === 'half_carton') {
            unitPrice = eggsPrice / 2; // Medio cartón cuesta la mitad
        } else { // box
            unitPrice = eggsPrice * 12;
        }
        setTotal(quantity * unitPrice);
    }, [quantity, saleType, eggsPrice]);

    // Efecto para calcular el total recibido y el cambio
    useEffect(() => {
        const received = Object.entries(receivedMoney).reduce(
            (sum, [bill, count]) => sum + parseInt(bill) * count,
            0
        );
        setTotalReceived(received);
        setChange(received - total);
    }, [receivedMoney, total]);

    // Función para manejar el cambio de cantidad
    const handleQuantityChange = (value) => {
        if (value < 0) return;
        setQuantity(value);
    };

    // Función para manejar la selección de billetes
    const handleBillPress = (bill) => {
        setReceivedMoney({
            ...receivedMoney,
            [bill]: (receivedMoney[bill] || 0) + 1,
        });
    };

    // Función para reiniciar la calculadora
    const resetCalculator = () => {
        setVentaCompleta(true);
        setSaleType('carton');
        setQuantity(0);
        setReceivedMoney({});
        setStep('quantity');
        setTotal(0);
        setChange(0);
        setTotalReceived(0);
    };

    // Función para confirmar la venta
    const confirmSale = () => {
        if (change < 0) {
            Alert.alert(
                'Error',
                'El monto recibido es menor que el total de la venta.',
                [{ text: 'OK' }]
            );
            return;
        }

        const transaction = {
            type: saleType,
            quantity,
            unitPrice: saleType === 'carton'
                ? eggsPrice
                : saleType === 'half_carton'
                    ? eggsPrice / 2
                    : eggsPrice * 12,
            total,
            receivedMoney,
            totalReceived,
            change,
            location: currentLocation, // Añadir la ubicación a la transacción
        };

        onSaveTransaction(transaction);
        resetCalculator();
    };

    // Renderizado de la etapa de selección de cantidad
    const renderQuantityStep = () => (
        <View style={styles.stepContainer}>
            {/* Selector de tipo de venta (completa o dividida) */}
            <View style={styles.ventaTypeSelector}>
                <TouchableOpacity
                    style={[styles.ventaTypeButton, ventaCompleta && styles.selectedVentaTypeButton]}
                    onPress={() => setVentaCompleta(true)}
                >
                    <Text style={[styles.ventaTypeButtonText, ventaCompleta && styles.selectedVentaTypeButtonText]}>
                        Venta Completa
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.ventaTypeButton, !ventaCompleta && styles.selectedVentaTypeButton]}
                    onPress={() => setVentaCompleta(false)}
                >
                    <Text style={[styles.ventaTypeButtonText, !ventaCompleta && styles.selectedVentaTypeButtonText]}>
                        Venta Dividida
                    </Text>
                </TouchableOpacity>
            </View>

            {ventaCompleta ? (
                // Selector de tipo para venta completa
                <View style={styles.typeSelector}>
                    <TouchableOpacity
                        style={[styles.typeButton, saleType === 'carton' && styles.selectedTypeButton]}
                        onPress={() => setSaleType('carton')}
                    >
                        <Text style={[styles.typeButtonText, saleType === 'carton' && styles.selectedTypeButtonText]}>
                            Cartones
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.typeButton, saleType === 'box' && styles.selectedTypeButton]}
                        onPress={() => setSaleType('box')}
                    >
                        <Text style={[styles.typeButtonText, saleType === 'box' && styles.selectedTypeButtonText]}>
                            Cajas
                        </Text>
                    </TouchableOpacity>
                </View>
            ) : (
                // Selector para venta dividida (solo medios cartones)
                <View style={styles.typeSelector}>
                    <TouchableOpacity
                        style={[styles.typeButton, styles.selectedTypeButton]}
                        onPress={() => setSaleType('half_carton')}
                    >
                        <Text style={[styles.typeButtonText, styles.selectedTypeButtonText]}>
                            Medios Cartones
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.quantitySelector}>
                <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(quantity - 1)}
                >
                    <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <View style={styles.quantityValueContainer}>
                    <Text style={styles.quantityValue}>{quantity}</Text>
                </View>
                <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => handleQuantityChange(quantity + 1)}
                >
                    <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.summaryContainer}>
                <Text style={styles.priceText}>
                    Precio por {
                        saleType === 'carton'
                            ? 'cartón'
                            : saleType === 'half_carton'
                                ? 'medio cartón'
                                : 'caja'
                    }: ${
                        saleType === 'carton'
                            ? eggsPrice.toFixed(2)
                            : saleType === 'half_carton'
                                ? (eggsPrice / 2).toFixed(2)
                                : (eggsPrice * 12).toFixed(2)
                    }
                </Text>
                <Text style={styles.totalText}>
                    Total: ${total.toFixed(2)}
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.continueButton, quantity === 0 && styles.disabledButton]}
                onPress={() => quantity > 0 && setStep('payment')}
                disabled={quantity === 0}
            >
                <Text style={styles.continueButtonText}>Continuar</Text>
            </TouchableOpacity>
        </View>
    );

    // Renderizado de la etapa de pago
    const renderPaymentStep = () => (
        <View style={styles.stepContainer}>
            <View style={styles.paymentHeader}>
                <Text style={styles.paymentHeaderText}>
                    Total a pagar: ${total.toFixed(2)}
                </Text>
                <Text style={styles.paymentSubHeaderText}>
                    Seleccione los billetes recibidos
                </Text>
            </View>

            <View style={styles.billsContainer}>
                {BILLS.map((bill) => (
                    <TouchableOpacity
                        key={bill}
                        style={styles.billButton}
                        onPress={() => handleBillPress(bill)}
                    >
                        <Text style={styles.billValue}>${bill}</Text>
                        <Text style={styles.billCount}>
                            {receivedMoney[bill] ? `x${receivedMoney[bill]}` : ''}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.receivedSummary}>
                <Text style={styles.receivedText}>
                    Recibido: ${totalReceived.toFixed(2)}
                </Text>
                <Text style={[
                    styles.changeText,
                    change < 0 ? styles.negativeChange : styles.positiveChange
                ]}>
                    {change >= 0 ? `Cambio: $${change.toFixed(2)}` : `Faltante: $${Math.abs(change).toFixed(2)}`}
                </Text>
            </View>

            <View style={styles.paymentButtons}>
                <TouchableOpacity
                    style={[styles.resetButton]}
                    onPress={() => {
                        setReceivedMoney({});
                    }}
                >
                    <Text style={styles.resetButtonText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.confirmButton, change < 0 && styles.disabledButton]}
                    onPress={confirmSale}
                    disabled={change < 0}
                >
                    <Text style={styles.confirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.backButton}
                onPress={() => setStep('quantity')}
            >
                <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <ScrollView style={styles.container}>
            {step === 'quantity' ? renderQuantityStep() : renderPaymentStep()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    stepContainer: {
        padding: 10,
    },
    ventaTypeSelector: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    ventaTypeButton: {
        flex: 1,
        backgroundColor: COLORS.card,
        padding: 10,
        alignItems: 'center',
        borderRadius: 5,
        marginHorizontal: 5,
    },
    selectedVentaTypeButton: {
        backgroundColor: COLORS.primary,
    },
    ventaTypeButtonText: {
        color: COLORS.text,
        fontWeight: '500',
        fontSize: 14,
    },
    selectedVentaTypeButtonText: {
        fontWeight: 'bold',
    },
    typeSelector: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    typeButton: {
        flex: 1,
        backgroundColor: COLORS.card,
        padding: 15,
        alignItems: 'center',
        borderRadius: 5,
        marginHorizontal: 5,
    },
    selectedTypeButton: {
        backgroundColor: COLORS.accent,
    },
    typeButtonText: {
        color: COLORS.text,
        fontWeight: '500',
        fontSize: 16,
    },
    selectedTypeButtonText: {
        fontWeight: 'bold',
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    quantityButton: {
        backgroundColor: COLORS.accent,
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
    },
    quantityButtonText: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    quantityValueContainer: {
        width: 100,
        height: 60,
        backgroundColor: COLORS.card,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 20,
    },
    quantityValue: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    summaryContainer: {
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 5,
        marginBottom: 20,
    },
    priceText: {
        color: COLORS.text,
        fontSize: 16,
        marginBottom: 10,
    },
    totalText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    continueButton: {
        backgroundColor: COLORS.success,
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: COLORS.border,
        opacity: 0.5,
    },
    continueButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    paymentHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    paymentHeaderText: {
        color: COLORS.text,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    paymentSubHeaderText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    billsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    billButton: {
        width: '31%',
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 10,
    },
    billValue: {
        color: COLORS.accent,
        fontSize: 20,
        fontWeight: 'bold',
    },
    billCount: {
        color: COLORS.text,
        fontSize: 14,
        marginTop: 5,
    },
    receivedSummary: {
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 5,
        marginBottom: 20,
    },
    receivedText: {
        color: COLORS.text,
        fontSize: 16,
        marginBottom: 10,
    },
    changeText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    positiveChange: {
        color: COLORS.success,
    },
    negativeChange: {
        color: COLORS.error,
    },
    paymentButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    resetButton: {
        backgroundColor: COLORS.error,
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        flex: 1,
        marginRight: 5,
    },
    resetButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmButton: {
        backgroundColor: COLORS.success,
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        flex: 1,
        marginLeft: 5,
    },
    confirmButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    backButton: {
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    backButtonText: {
        color: COLORS.text,
        fontSize: 16,
    },
});

export default SaleCalculator;