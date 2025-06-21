// Components/Home/SaleCalculator.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const [showCompositePayment, setShowCompositePayment] = useState(false); // Estado para el modal de pago compuesto
    const [compositeAmount, setCompositeAmount] = useState(''); // Estado para el monto del pago compuesto
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [pendingTransaction, setPendingTransaction] = useState(null);

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
            (sum, [bill, count]) => {
                const billValue = parseFloat(bill);
                const billCount = parseInt(count);

                // Validar que sean números válidos
                if (isNaN(billValue) || isNaN(billCount) || billCount < 0) {
                    return sum;
                }

                return sum + (billValue * billCount);
            },
            0
        );

        // Redondear para evitar errores de precisión
        const roundedReceived = Math.round(received * 100) / 100;
        const roundedTotal = Math.round(total * 100) / 100;
        const calculatedChange = Math.round((roundedReceived - roundedTotal) * 100) / 100;

        setTotalReceived(roundedReceived);
        setChange(calculatedChange);
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
        setShowCompositePayment(false);
        setCompositeAmount('');
    };

    // Función para manejar el pago exacto
    const handleExactPayment = () => {
        // Validar que el total sea válido
        if (isNaN(total) || !isFinite(total) || total <= 0) {
            Alert.alert(
                'Error',
                'Error en el cálculo del total. Reinicie la calculadora.',
                [{ text: 'OK' }]
            );
            return;
        }

        const roundedTotal = Math.round(total * 100) / 100;

        const transaction = {
            type: saleType,
            quantity,
            unitPrice: saleType === 'carton'
                ? eggsPrice
                : saleType === 'half_carton'
                    ? eggsPrice / 2
                    : eggsPrice * 12,
            total: roundedTotal,
            receivedMoney: { [roundedTotal]: 1 },
            totalReceived: roundedTotal,
            change: 0,
            location: currentLocation,
            paymentType: 'exact',
        };

        setPendingTransaction(transaction);
        setShowConfirmationModal(true);
    };

    // Función para procesar el pago compuesto
    const handleCompositePayment = () => {
        const amount = parseFloat(compositeAmount);

        // Validaciones más estrictas
        if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
            Alert.alert(
                'Error',
                'El monto debe ser un número válido mayor a cero.',
                [{ text: 'OK' }]
            );
            return;
        }

        if (amount < total) {
            Alert.alert(
                'Error',
                'El monto debe ser mayor o igual al total de la venta.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Redondear a 2 decimales para evitar errores de precisión
        const roundedAmount = Math.round(amount * 100) / 100;
        const roundedTotal = Math.round(total * 100) / 100;
        const calculatedChange = Math.round((roundedAmount - roundedTotal) * 100) / 100;

        const transaction = {
            type: saleType,
            quantity,
            unitPrice: saleType === 'carton'
                ? eggsPrice
                : saleType === 'half_carton'
                    ? eggsPrice / 2
                    : eggsPrice * 12,
            total: roundedTotal,
            receivedMoney: { [roundedAmount]: 1 },
            totalReceived: roundedAmount,
            change: calculatedChange,
            location: currentLocation,
            paymentType: 'composite',
        };

        setPendingTransaction(transaction);
        setShowCompositePayment(false);
        setCompositeAmount('');
        setShowConfirmationModal(true);
    };

    // Función para confirmar la venta
    const confirmSale = () => {
        // Validar que change sea un número válido
        if (isNaN(change) || !isFinite(change) || change < 0) {
            Alert.alert(
                'Error',
                'El monto recibido es menor que el total de la venta.',
                [{ text: 'OK' }]
            );
            return;
        }

        // Validar que totalReceived sea válido
        if (isNaN(totalReceived) || !isFinite(totalReceived) || totalReceived < total) {
            Alert.alert(
                'Error',
                'Error en el cálculo del pago. Verifique los montos ingresados.',
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
            total: Math.round(total * 100) / 100,
            receivedMoney,
            totalReceived: Math.round(totalReceived * 100) / 100,
            change: Math.round(change * 100) / 100,
            location: currentLocation,
        };

        setPendingTransaction(transaction);
        setShowConfirmationModal(true);
    };

    // Función para confirmar la transacción desde el modal
    const handleConfirmTransaction = () => {
        if (pendingTransaction) {
            onSaveTransaction(pendingTransaction);
            resetCalculator();
            setPendingTransaction(null);
            setShowConfirmationModal(false);
        }
    };

    // Función para cancelar la transacción desde el modal
    const handleCancelTransaction = () => {
        setPendingTransaction(null);
        setShowConfirmationModal(false);
    };

    // Renderizado del modal de confirmación
    const renderConfirmationModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showConfirmationModal}
            onRequestClose={handleCancelTransaction}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.enhancedModalContent}>
                    {/* Icono de confirmación */}
                    <View style={styles.confirmationIconContainer}>
                        <View style={styles.confirmationIcon}>
                            <Text style={styles.confirmationIconText}>✓</Text>
                        </View>
                    </View>

                    <Text style={styles.enhancedModalTitle}>Confirmar Venta</Text>
                    <Text style={styles.enhancedModalSubtitle}>
                        Revisa los detalles antes de proceder
                    </Text>

                    {/* Detalles de la venta */}
                    <View style={styles.enhancedConfirmationDetails}>
                        <View style={styles.saleDetailCard}>
                            <Text style={styles.saleDetailTitle}>Resumen de Venta</Text>
                            <View style={styles.saleDetailRow}>
                                <Text style={styles.saleDetailLabel}>Tipo:</Text>
                                <Text style={styles.saleDetailValue}>
                                    {pendingTransaction?.type === 'carton' ? 'Cartones' :
                                        pendingTransaction?.type === 'half_carton' ? 'Medios Cartones' : 'Cajas'}
                                </Text>
                            </View>
                            <View style={styles.saleDetailRow}>
                                <Text style={styles.saleDetailLabel}>Cantidad:</Text>
                                <Text style={styles.saleDetailValue}>{pendingTransaction?.quantity}</Text>
                            </View>
                            <View style={styles.saleDetailRow}>
                                <Text style={styles.saleDetailLabel}>Total:</Text>
                                <Text style={styles.saleDetailTotalValue}>
                                    ${pendingTransaction?.total.toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        {/* Información de pago */}
                        <View style={styles.paymentInfoCard}>
                            <View style={styles.paymentInfoRow}>
                                <View style={styles.paymentInfoItem}>
                                    <Text style={styles.paymentInfoLabel}>💰 Recibido</Text>
                                    <Text style={styles.paymentInfoValue}>
                                        ${pendingTransaction?.totalReceived.toFixed(2)}
                                    </Text>
                                </View>
                                <View style={styles.paymentInfoDivider} />
                                <View style={styles.paymentInfoItem}>
                                    <Text style={styles.paymentInfoLabel}>
                                        {pendingTransaction?.change === 0 ? '✅ Exacto' : '💸 Cambio'}
                                    </Text>
                                    <Text style={[
                                        styles.paymentInfoValue,
                                        pendingTransaction?.change === 0 ? styles.exactPayment : styles.changeAmount
                                    ]}>
                                        ${pendingTransaction?.change.toFixed(2)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Botones mejorados */}
                    <View style={styles.enhancedModalButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.enhancedModalButton, styles.enhancedCancelButton]}
                            onPress={handleCancelTransaction}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.enhancedCancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.enhancedModalButton, styles.enhancedConfirmButton]}
                            onPress={handleConfirmTransaction}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.enhancedConfirmButtonText}>Confirmar Venta</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

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

            {/* Botones de pago especial */}
            <View style={styles.specialPaymentContainer}>
                <TouchableOpacity
                    style={styles.specialPaymentButton}
                    onPress={handleExactPayment}
                >
                    <Text style={styles.specialPaymentText}>Pago Exacto</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.specialPaymentButton}
                    onPress={() => setShowCompositePayment(true)}
                >
                    <Text style={styles.specialPaymentText}>Pago Compuesto</Text>
                </TouchableOpacity>
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

    // Renderizado del modal de pago compuesto
    const renderCompositePaymentModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showCompositePayment}
            onRequestClose={() => setShowCompositePayment(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Pago Compuesto</Text>
                    <Text style={styles.modalSubtitle}>
                        Total a pagar: ${total.toFixed(2)}
                    </Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Monto recibido ($):</Text>
                        <TextInput
                            style={styles.input}
                            value={compositeAmount}
                            onChangeText={setCompositeAmount}
                            keyboardType="numeric"
                            placeholder={total.toFixed(2)}
                            placeholderTextColor="#666"
                        />
                    </View>

                    {compositeAmount && !isNaN(parseFloat(compositeAmount)) && parseFloat(compositeAmount) >= total && (
                        <Text style={styles.changePreview}>
                            Cambio a dar: ${(parseFloat(compositeAmount) - total).toFixed(2)}
                        </Text>
                    )}

                    <View style={styles.modalButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => {
                                setShowCompositePayment(false);
                                setCompositeAmount('');
                            }}
                        >
                            <Text style={styles.modalButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.modalButton,
                                styles.confirmButton,
                                (!compositeAmount || isNaN(parseFloat(compositeAmount)) || parseFloat(compositeAmount) < total) && styles.disabledButton
                            ]}
                            onPress={handleCompositePayment}
                            disabled={!compositeAmount || isNaN(parseFloat(compositeAmount)) || parseFloat(compositeAmount) < total}
                        >
                            <Text style={styles.modalButtonText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.safeContainer} edges={['bottom']}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {step === 'quantity' ? renderQuantityStep() : renderPaymentStep()}
                {renderCompositePaymentModal()}
                {renderConfirmationModal()}
            </ScrollView>
        </SafeAreaView>
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
    specialPaymentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    specialPaymentButton: {
        flex: 1,
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    specialPaymentText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: '85%',
        backgroundColor: COLORS.card,
        borderRadius: 10,
        padding: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 16,
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
        paddingVertical: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    changePreview: {
        color: COLORS.success,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
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
    modalButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
    },
    enhancedModalContent: {
        width: '90%',
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 10,
    },
    confirmationIconContainer: {
        alignItems: 'center',
        marginBottom: 15,
    },
    confirmationIcon: {
        width: 60,
        height: 60,
        backgroundColor: COLORS.success,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.success,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    confirmationIconText: {
        color: '#fff',
        fontSize: 30,
        fontWeight: 'bold',
    },
    enhancedModalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 5,
    },
    enhancedModalSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 25,
    },
    enhancedConfirmationDetails: {
        marginBottom: 25,
    },
    saleDetailCard: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    saleDetailTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
    },
    saleDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    saleDetailLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        flex: 1,
    },
    saleDetailValue: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        textAlign: 'right',
    },
    saleDetailTotalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        textAlign: 'right',
    },
    paymentInfoCard: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    paymentInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentInfoItem: {
        flex: 1,
        alignItems: 'center',
    },
    paymentInfoDivider: {
        width: 1,
        height: 40,
        backgroundColor: COLORS.border,
        marginHorizontal: 15,
    },
    paymentInfoLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 4,
        textAlign: 'center',
    },
    paymentInfoValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
    },
    exactPayment: {
        color: COLORS.success,
    },
    changeAmount: {
        color: COLORS.accent,
    },
    enhancedModalButtonsContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    enhancedModalButton: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    enhancedCancelButton: {
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: COLORS.error,
    },
    enhancedConfirmButton: {
        backgroundColor: COLORS.success,
    },
    enhancedCancelButtonText: {
        color: COLORS.error,
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 18,
        flexWrap: 'wrap',
    },
    enhancedConfirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 18,
        flexWrap: 'wrap',
    },
    safeContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 20,
    },
});

export default SaleCalculator;