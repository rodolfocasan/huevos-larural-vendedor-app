// Components/Home/SaleCalculator.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput, AppState } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Picker } from '@react-native-picker/picker';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS, BILLS } from '../Utils/Constants';





// Configurar el handler de notificaciones
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

// Componente para manejar la calculadora de ventas
const SaleCalculator = ({ onSaveTransaction, eggsPrice, currentLocation }) => {
    const [saleType, setSaleType] = useState('carton'); // Estado para el tipo de venta: 'Cartón', 'Medio Cartón' o 'Caja'
    const [ventaCompleta, setVentaCompleta] = useState(true); // Estado para controlar si es venta completa o dividida
    const [quantity, setQuantity] = useState(0); // Estado para la cantidad de unidades a vender
    const [receivedMoney, setReceivedMoney] = useState({}); // Estado para el dinero recibido, organizado por denominación de billetes
    const [step, setStep] = useState('quantity'); // Estado para la etapa actual del proceso: 'quantity', 'payment', 'result', 'pending_list'
    const [total, setTotal] = useState(0); // Estado para el total de la venta
    const [change, setChange] = useState(0); // Estado para el cambio a devolver
    const [totalReceived, setTotalReceived] = useState(0); // Estado para el total de dinero recibido
    const [showCompositePayment, setShowCompositePayment] = useState(false); // Estado para el modal de pago compuesto
    const [compositeAmount, setCompositeAmount] = useState(''); // Estado para el monto del pago compuesto
    const [showConfirmationModal, setShowConfirmationModal] = useState(false);
    const [pendingTransaction, setPendingTransaction] = useState(null);
    const [showPendingPaymentModal, setShowPendingPaymentModal] = useState(false);
    const [selectedTime, setSelectedTime] = useState(5); // Tiempo por defecto en minutos
    const [pendingPayments, setPendingPayments] = useState([]); // Lista de cobros pendientes
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelingPayment, setCancelingPayment] = useState(null);
    const [currentTime, setCurrentTime] = useState(new Date()); // Para el contador en tiempo real
    const [pendingPaymentId, setPendingPaymentId] = useState(null); // ID del pago pendiente actual

    // Función para solicitar permisos de notificaciones
    const requestNotificationPermissions = async () => {
        try {
            if (Device.isDevice) {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;

                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (finalStatus !== 'granted') {
                    Alert.alert(
                        'Permisos de Notificación',
                        'Se requieren permisos de notificación para enviar recordatorios de cobros pendientes.',
                        [{ text: 'OK' }]
                    );
                    return false;
                }

                // Configurar los canales de notificaciones para Android
                if (Platform.OS === 'android') {
                    // Canal por defecto
                    await Notifications.setNotificationChannelAsync('default', {
                        name: 'Notificaciones Generales',
                        importance: Notifications.AndroidImportance.MAX,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF231F7C',
                    });

                    // Canal específico para cobros pendientes con sonido personalizado
                    try {
                        await Notifications.setNotificationChannelAsync('pending_payment_channel', {
                            name: 'Cobros Pendientes',
                            importance: Notifications.AndroidImportance.MAX,
                            vibrationPattern: [0, 250, 250, 250],
                            lightColor: '#FF231F7C',
                            sound: 'cobro_pendiente.wav',
                            enableVibrate: true,
                            enableLights: true,
                        });
                        console.log('Canal de notificaciones con sonido personalizado configurado');
                    } catch (soundError) {
                        console.error('Error configurando canal con sonido personalizado:', soundError);
                        // Fallback al canal por defecto
                        await Notifications.setNotificationChannelAsync('pending_payment_channel', {
                            name: 'Cobros Pendientes',
                            importance: Notifications.AndroidImportance.MAX,
                            vibrationPattern: [0, 250, 250, 250],
                            lightColor: '#FF231F7C',
                            sound: 'default',
                            enableVibrate: true,
                            enableLights: true,
                        });
                        console.log('Canal de notificaciones con sonido por defecto configurado como fallback');
                    }
                }

                return true;
            } else {
                Alert.alert(
                    'Simulador Detectado',
                    'Las notificaciones push no funcionan en el simulador. Prueba en un dispositivo real.',
                    [{ text: 'OK' }]
                );
                return false;
            }
        } catch (error) {
            console.error('Error solicitando permisos de notificación:', error);
            return false;
        }
    };

    // Función para configurar listeners de notificaciones
    const setupNotificationListeners = () => {
        // Listener para cuando se toca una notificación
        const notificationClickSubscription = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const { type, paymentId } = response.notification.request.content.data;

                if (type === 'pending_payment' || type === 'recurring_pending_payment') {
                    // Navegar a la lista de cobros pendientes
                    setStep('pending_list');
                }
            }
        );

        // Listener para cuando se recibe una notificación mientras la app está abierta
        const notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
            (notification) => {
                console.log('Notificación recibida:', notification);
            }
        );

        return () => {
            notificationClickSubscription.remove();
            notificationReceivedSubscription.remove();
        };
    };

    useEffect(() => {
        // Solicitar permisos y configurar listeners al montar el componente
        requestNotificationPermissions();
        const cleanupListeners = setupNotificationListeners();

        return cleanupListeners;
    }, []);


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
        setPendingPaymentId(null); // Limpiar el ID del pago pendiente
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
            pendingPaymentId: pendingPaymentId, // Agregar el ID del pago pendiente si existe
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
            pendingPaymentId: pendingPaymentId, // Agregar el ID del pago pendiente si existe
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
            pendingPaymentId: pendingPaymentId, // Agregar el ID del pago pendiente si existe
        };

        setPendingTransaction(transaction);
        setShowConfirmationModal(true);
    };

    // Función para confirmar la transacción desde el modal
    const handleConfirmTransaction = async () => {
        if (pendingTransaction) {
            onSaveTransaction(pendingTransaction);

            if (pendingTransaction.pendingPaymentId || pendingPaymentId) {
                const paymentIdToRemove = pendingTransaction.pendingPaymentId || pendingPaymentId;

                const paymentToRemove = pendingPayments.find(p => p.id === paymentIdToRemove);
                if (paymentToRemove) {
                    // Cancelar definitivamente las notificaciones ya que el pago se confirmó
                    await cancelPaymentNotifications(paymentToRemove);
                }

                setPendingPayments(prev => {
                    const updatedPayments = prev.filter(p => p.id !== paymentIdToRemove);
                    const paymentToRemove = prev.find(p => p.id === paymentIdToRemove);
                    if (paymentToRemove && paymentToRemove.recurringInterval) {
                        clearInterval(paymentToRemove.recurringInterval);
                    }
                    return updatedPayments;
                });
            }

            resetCalculator();
            setPendingTransaction(null);
            setShowConfirmationModal(false);
            setPendingPaymentId(null); // Limpiar el ID del pago pendiente
        }
    };

    // Función para cancelar la transacción desde el modal
    const handleCancelTransaction = () => {
        setPendingTransaction(null);
        setShowConfirmationModal(false);
    };

    // Efecto para el contador en tiempo real
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Constantes para el sistema de notificaciones
    const STORAGE_KEY = '@pending_payments';
    const NOTIFICATION_INTERVALS = [5, 10, 15, 30, 60]; // minutos para recordatorios adicionales

    // Función para cargar pagos pendientes desde AsyncStorage
    const loadPendingPayments = async () => {
        try {
            const storedPayments = await AsyncStorage.getItem(STORAGE_KEY);
            if (storedPayments) {
                const payments = JSON.parse(storedPayments);
                setPendingPayments(payments);

                // Verificar si hay pagos que necesitan notificaciones adicionales
                await checkAndScheduleOverdueNotifications(payments);
            }
        } catch (error) {
            console.error('Error cargando pagos pendientes:', error);
        }
    };

    // Función para guardar pagos pendientes en AsyncStorage
    const savePendingPayments = async (payments) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payments));
        } catch (error) {
            console.error('Error guardando pagos pendientes:', error);
        }
    };

    // Función para verificar y programar notificaciones para pagos vencidos
    const checkAndScheduleOverdueNotifications = async (payments) => {
        try {
            const now = new Date();

            for (const payment of payments) {
                const createdAt = new Date(payment.createdAt);
                const reminderTime = payment.reminderTime * 60 * 1000; // convertir a milisegundos
                const timeSinceCreated = now - createdAt;

                // Si ya pasó el tiempo inicial y no se han programado notificaciones adicionales
                if (timeSinceCreated >= reminderTime && !payment.overdueNotificationsScheduled) {
                    // Programar notificaciones adicionales para este pago vencido
                    await scheduleOverdueNotifications(payment);

                    // Marcar como programado en el storage
                    const updatedPayments = payments.map(p =>
                        p.id === payment.id
                            ? { ...p, overdueNotificationsScheduled: true }
                            : p
                    );
                    await savePendingPayments(updatedPayments);
                    setPendingPayments(updatedPayments);
                }
            }
        } catch (error) {
            console.error('Error verificando pagos vencidos:', error);
        }
    };

    // Función para programar notificaciones adicionales para pagos vencidos
    const scheduleOverdueNotifications = async (payment) => {
        try {
            const overdueIntervals = [10, 30, 60, 120]; // minutos después del vencimiento
            const notificationIds = [];

            for (let i = 0; i < overdueIntervals.length; i++) {
                const additionalMinutes = overdueIntervals[i];
                const totalSeconds = additionalMinutes * 60;

                let notificationConfig = {
                    content: {
                        title: '🚨 COBRO VENCIDO - Acción Requerida',
                        body: `Cobro vencido hace ${additionalMinutes} min: $${payment.total.toFixed(2)} por ${payment.quantity} ${payment.saleType === 'carton' ? 'cartón(es)' :
                            payment.saleType === 'half_carton' ? 'medio(s) cartón(es)' :
                                'caja(s)'
                            } en ${payment.location}`,
                        data: {
                            type: 'overdue_pending_payment',
                            paymentId: payment.id,
                            total: payment.total,
                            quantity: payment.quantity,
                            saleType: payment.saleType,
                            location: payment.location,
                            overdueLevel: i
                        },
                        priority: 'max',
                    },
                    trigger: {
                        seconds: totalSeconds,
                    },
                };

                // Configurar sonido según la plataforma
                if (Platform.OS === 'android') {
                    notificationConfig.content.channelId = 'pending_payment_channel';
                    notificationConfig.content.sound = 'default';
                } else {
                    notificationConfig.content.sound = 'default';
                }

                try {
                    const notificationId = await Notifications.scheduleNotificationAsync(notificationConfig);
                    notificationIds.push(notificationId);
                    console.log(`Notificación vencida ${i + 1} programada para ${totalSeconds} segundos, ID:`, notificationId);
                } catch (error) {
                    console.error(`Error programando notificación vencida ${i + 1}:`, error);
                }
            }

            return notificationIds;
        } catch (error) {
            console.error('Error programando notificaciones vencidas:', error);
            return [];
        }
    };

    // Función para cancelar todas las notificaciones de un pago
    const cancelPaymentNotifications = async (payment) => {
        try {
            // Cancelar notificaciones por ID si existen
            if (payment.notificationIds && payment.notificationIds.length > 0) {
                console.log(`Cancelando ${payment.notificationIds.length} notificaciones para el pago ${payment.id}`);

                for (const notificationId of payment.notificationIds) {
                    try {
                        await Notifications.cancelScheduledNotificationAsync(notificationId);
                    } catch (error) {
                        console.error('Error cancelando notificación:', notificationId, error);
                    }
                }

                console.log(`Todas las notificaciones del pago ${payment.id} han sido canceladas`);
            }

            // También cancelar la notificación individual si existe (compatibilidad con versiones anteriores)
            if (payment.notificationId) {
                try {
                    await Notifications.cancelScheduledNotificationAsync(payment.notificationId);
                    console.log('Notificación individual cancelada:', payment.notificationId);
                } catch (error) {
                    console.error('Error cancelando notificación individual:', payment.notificationId, error);
                }
            }
        } catch (error) {
            console.error('Error cancelando notificaciones del pago:', error);
        }
    };

    // Función para programar solo la notificación inicial
    const scheduleInitialNotification = async (payment) => {
        try {
            const notificationConfig = {
                content: {
                    title: '💰 Recordatorio de Cobro Pendiente',
                    body: `Tienes un cobro pendiente de $${payment.total.toFixed(2)} por ${payment.quantity} ${payment.saleType === 'carton' ? 'cartón(es)' :
                        payment.saleType === 'half_carton' ? 'medio(s) cartón(es)' :
                            'caja(s)'
                        } en ${payment.location}`,
                    data: {
                        type: 'pending_payment',
                        paymentId: payment.id,
                        total: payment.total,
                        quantity: payment.quantity,
                        saleType: payment.saleType,
                        location: payment.location,
                        isInitial: true
                    },
                    priority: 'max',
                },
                trigger: {
                    seconds: payment.reminderTime * 60,
                },
            };

            // Configurar sonido y canal
            if (Platform.OS === 'android') {
                notificationConfig.content.channelId = 'pending_payment_channel';
                notificationConfig.content.sound = 'default';
            } else {
                notificationConfig.content.sound = 'default';
            }

            const notificationId = await Notifications.scheduleNotificationAsync(notificationConfig);
            console.log('Notificación inicial programada, ID:', notificationId);
            return notificationId;
        } catch (error) {
            console.error('Error programando notificación inicial:', error);
            return null;
        }
    };

    // Función para programar notificaciones recurrentes después de la inicial
    const scheduleRecurringNotifications = async (payment) => {
        try {
            let notificationCounter = 1;
            const maxNotifications = 100; // Máximo 100 notificaciones recurrentes

            const scheduleNext = async () => {
                if (notificationCounter > maxNotifications) {
                    console.log('Límite de notificaciones alcanzado');
                    return;
                }

                // Verificar si el pago aún existe en la lista
                const currentPayments = await AsyncStorage.getItem(STORAGE_KEY);
                if (currentPayments) {
                    const payments = JSON.parse(currentPayments);
                    const paymentExists = payments.some(p => p.id === payment.id);

                    if (!paymentExists) {
                        console.log('Pago cancelado, deteniendo notificaciones recurrentes');
                        return;
                    }
                }

                const notificationConfig = {
                    content: {
                        title: '🔔 RECORDATORIO URGENTE - Cobro Pendiente',
                        body: `¡ATENCIÓN! Cobro pendiente: $${payment.total.toFixed(2)} por ${payment.quantity} ${payment.saleType === 'carton' ? 'cartón(es)' :
                            payment.saleType === 'half_carton' ? 'medio(s) cartón(es)' :
                                'caja(s)'
                            } en ${payment.location}`,
                        data: {
                            type: 'recurring_pending_payment',
                            paymentId: payment.id,
                            total: payment.total,
                            quantity: payment.quantity,
                            saleType: payment.saleType,
                            location: payment.location,
                            recurringNumber: notificationCounter
                        },
                        priority: 'max',
                    },
                    trigger: {
                        seconds: 10, // Programar para dentro de 10 segundos
                    },
                };

                // Configurar sonido y canal
                if (Platform.OS === 'android') {
                    notificationConfig.content.channelId = 'pending_payment_channel';
                    notificationConfig.content.sound = 'default';
                } else {
                    notificationConfig.content.sound = 'default';
                }

                try {
                    const notificationId = await Notifications.scheduleNotificationAsync(notificationConfig);
                    console.log(`Notificación recurrente #${notificationCounter} programada, ID:`, notificationId);

                    // Guardar el ID de la notificación para poder cancelarla después
                    const currentPayments = await AsyncStorage.getItem(STORAGE_KEY);
                    if (currentPayments) {
                        const payments = JSON.parse(currentPayments);
                        const updatedPayments = payments.map(p => {
                            if (p.id === payment.id) {
                                return {
                                    ...p,
                                    notificationIds: [...(p.notificationIds || []), notificationId]
                                };
                            }
                            return p;
                        });
                        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPayments));
                    }

                    notificationCounter++;

                    // Programar la siguiente notificación
                    setTimeout(scheduleNext, 10000); // 10 segundos después
                } catch (error) {
                    console.error(`Error programando notificación recurrente #${notificationCounter}:`, error);
                }
            };

            // Iniciar el ciclo después del tiempo inicial
            setTimeout(scheduleNext, payment.reminderTime * 60 * 1000);

        } catch (error) {
            console.error('Error configurando notificaciones recurrentes:', error);
        }
    };

    // Función para programar un cobro pendiente
    const handlePendingPayment = async () => {
        try {
            // Verificar permisos antes de programar
            const hasPermission = await requestNotificationPermissions();
            if (!hasPermission) {
                Alert.alert(
                    'Error',
                    'No se pueden programar recordatorios sin permisos de notificación.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const newPendingPayment = {
                id: Date.now().toString(),
                total: total,
                quantity: quantity,
                saleType: saleType,
                location: currentLocation,
                createdAt: new Date().toISOString(),
                reminderTime: selectedTime, // en minutos
                overdueNotificationsScheduled: false,
                notificationIds: [], // Array para almacenar IDs de notificaciones
                unitPrice: saleType === 'carton'
                    ? eggsPrice
                    : saleType === 'half_carton'
                        ? eggsPrice / 2
                        : eggsPrice * 12,
            };

            // Programar solo la notificación inicial
            const initialNotificationId = await scheduleInitialNotification(newPendingPayment);
            if (initialNotificationId) {
                newPendingPayment.notificationIds = [initialNotificationId];
            }

            // Configurar el sistema de notificaciones recurrentes (no las programa aún)
            scheduleRecurringNotifications(newPendingPayment);

            // Añadir a la lista de cobros pendientes
            const updatedPayments = [...pendingPayments, newPendingPayment];
            setPendingPayments(updatedPayments);

            // Guardar en AsyncStorage
            await savePendingPayments(updatedPayments);

            // Mostrar confirmación
            Alert.alert(
                'Recordatorio Programado',
                `Se ha programado un recordatorio para dentro de ${selectedTime} minuto${selectedTime === 1 ? '' : 's'} con notificaciones adicionales cada 10 segundos.`,
                [{ text: 'OK' }]
            );

            // Cerrar modal y reiniciar calculadora
            setShowPendingPaymentModal(false);
            resetCalculator();

        } catch (error) {
            console.error('Error programando notificación:', error);
            Alert.alert(
                'Error',
                'No se pudo programar el recordatorio. Verifica que los permisos de notificación estén habilitados.',
                [{ text: 'OK' }]
            );
        }
    };

    // Efecto para cargar pagos pendientes al iniciar
    useEffect(() => {
        loadPendingPayments();
    }, []);

    useEffect(() => {
        if (pendingPayments.length >= 0) {
            savePendingPayments(pendingPayments);
        }
    }, [pendingPayments]);

    // Efecto para manejar el ciclo de vida de la app y reanudar notificaciones si es necesario
    useEffect(() => {
        const handleAppStateChange = async (nextAppState) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                // Si el usuario cierra la app mientras procesaba un pago pendiente, reanudar notificaciones
                if (pendingPaymentId) {
                    await resumePaymentNotifications(pendingPaymentId);
                    setPendingPaymentId(null);
                }
            }
        };

        const subscription = AppState?.addEventListener?.('change', handleAppStateChange);

        return () => {
            if (subscription) {
                subscription.remove();
            }
        };
    }, [pendingPaymentId]);

    // Función para pausar notificaciones temporalmente
    const pausePaymentNotifications = async (paymentId) => {
        try {
            const payment = pendingPayments.find(p => p.id === paymentId);
            if (payment && payment.notificationIds && payment.notificationIds.length > 0) {
                // Cancelar todas las notificaciones programadas temporalmente
                for (const notificationId of payment.notificationIds) {
                    try {
                        await Notifications.cancelScheduledNotificationAsync(notificationId);
                    } catch (error) {
                        console.error('Error pausando notificación:', notificationId, error);
                    }
                }

                // Marcar como pausadas en el estado
                setPendingPayments(prev =>
                    prev.map(p =>
                        p.id === paymentId
                            ? { ...p, notificationsPaused: true, pausedAt: new Date().toISOString() }
                            : p
                    )
                );

                console.log(`Notificaciones pausadas para el pago ${paymentId}`);
            }
        } catch (error) {
            console.error('Error pausando notificaciones:', error);
        }
    };

    // Función para reanudar notificaciones
    const resumePaymentNotifications = async (paymentId) => {
        try {
            const payment = pendingPayments.find(p => p.id === paymentId);
            if (payment && payment.notificationsPaused) {
                // Calcular el tiempo transcurrido durante la pausa
                const pausedAt = new Date(payment.pausedAt);
                const now = new Date();
                const pausedDuration = Math.floor((now - pausedAt) / 1000); // en segundos

                // Reprogramar las notificaciones inmediatamente (cada 10 segundos)
                const scheduleResumedNotifications = async () => {
                    let notificationCounter = 1;
                    const maxNotifications = 100;

                    const scheduleNext = async () => {
                        if (notificationCounter > maxNotifications) {
                            console.log('Límite de notificaciones reanudadas alcanzado');
                            return;
                        }

                        // Verificar si el pago aún existe
                        const currentPayments = await AsyncStorage.getItem(STORAGE_KEY);
                        if (currentPayments) {
                            const payments = JSON.parse(currentPayments);
                            const paymentExists = payments.some(p => p.id === paymentId && !p.notificationsPaused);

                            if (!paymentExists) {
                                console.log('Pago cancelado o pausado, deteniendo notificaciones reanudadas');
                                return;
                            }
                        }

                        const notificationConfig = {
                            content: {
                                title: '🔔 RECORDATORIO URGENTE - Cobro Pendiente',
                                body: `¡ATENCIÓN! Cobro pendiente reanudado: $${payment.total.toFixed(2)} por ${payment.quantity} ${payment.saleType === 'carton' ? 'cartón(es)' :
                                    payment.saleType === 'half_carton' ? 'medio(s) cartón(es)' :
                                        'caja(s)'
                                    } en ${payment.location}`,
                                data: {
                                    type: 'resumed_pending_payment',
                                    paymentId: payment.id,
                                    total: payment.total,
                                    quantity: payment.quantity,
                                    saleType: payment.saleType,
                                    location: payment.location,
                                    resumedNumber: notificationCounter
                                },
                                priority: 'max',
                            },
                            trigger: {
                                seconds: 10,
                            },
                        };

                        if (Platform.OS === 'android') {
                            notificationConfig.content.channelId = 'pending_payment_channel';
                            notificationConfig.content.sound = 'default';
                        } else {
                            notificationConfig.content.sound = 'default';
                        }

                        try {
                            const notificationId = await Notifications.scheduleNotificationAsync(notificationConfig);
                            console.log(`Notificación reanudada #${notificationCounter} programada, ID:`, notificationId);

                            // Actualizar el array de notificationIds
                            const currentPayments = await AsyncStorage.getItem(STORAGE_KEY);
                            if (currentPayments) {
                                const payments = JSON.parse(currentPayments);
                                const updatedPayments = payments.map(p => {
                                    if (p.id === paymentId) {
                                        return {
                                            ...p,
                                            notificationIds: [...(p.notificationIds || []), notificationId]
                                        };
                                    }
                                    return p;
                                });
                                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPayments));
                            }

                            notificationCounter++;
                            setTimeout(scheduleNext, 10000); // 10 segundos después
                        } catch (error) {
                            console.error(`Error programando notificación reanudada #${notificationCounter}:`, error);
                        }
                    };

                    // Iniciar las notificaciones reanudadas inmediatamente
                    scheduleNext();
                };

                scheduleResumedNotifications();

                // Marcar como reanudadas en el estado
                setPendingPayments(prev =>
                    prev.map(p =>
                        p.id === paymentId
                            ? { ...p, notificationsPaused: false, pausedAt: null }
                            : p
                    )
                );

                console.log(`Notificaciones reanudadas para el pago ${paymentId}`);
            }
        } catch (error) {
            console.error('Error reanudando notificaciones:', error);
        }
    };

    const handlePaymentCompleted = async (paymentId) => {
        const payment = pendingPayments.find(p => p.id === paymentId);
        if (payment) {
            // Pausar notificaciones temporalmente mientras se procesa el pago
            await pausePaymentNotifications(paymentId);

            setSaleType(payment.saleType);
            setQuantity(payment.quantity);
            setVentaCompleta(payment.saleType !== 'half_carton');

            setReceivedMoney({});
            setTotalReceived(0);
            setChange(0);

            setPendingPaymentId(paymentId);

            setStep('payment');
        }
    };

    // Función para manejar cobro cancelado
    const handlePaymentCancelled = (paymentId) => {
        const payment = pendingPayments.find(p => p.id === paymentId);
        if (payment) {
            setCancelingPayment(payment);
            setShowCancelModal(true);
        }
    };

    // Función para confirmar cancelación
    const confirmCancelPayment = async () => {
        if (cancelingPayment) {
            try {
                // Cancelar TODAS las notificaciones programadas para este pago
                await cancelPaymentNotifications(cancelingPayment);

                // Remover el pago de la lista y limpiar intervalo si existe
                setPendingPayments(prev => {
                    const updatedPayments = prev.filter(p => p.id !== cancelingPayment.id);
                    const paymentToRemove = prev.find(p => p.id === cancelingPayment.id);
                    if (paymentToRemove && paymentToRemove.recurringInterval) {
                        clearInterval(paymentToRemove.recurringInterval);
                    }
                    return updatedPayments;
                });

                setShowCancelModal(false);
                setCancelingPayment(null);

                Alert.alert(
                    'Cobro Cancelado',
                    'El recordatorio de cobro y todas sus notificaciones han sido cancelados exitosamente.',
                    [{ text: 'OK' }]
                );
            } catch (error) {
                console.error('Error cancelando notificación:', error);
                Alert.alert(
                    'Error',
                    'Hubo un problema al cancelar el recordatorio.',
                    [{ text: 'OK' }]
                );
            }
        }
    };

    // Función para formatear el tiempo del contador
    const formatCounterTime = (createdAt, reminderTime) => {
        const now = currentTime;
        const created = new Date(createdAt);
        const elapsedSeconds = Math.floor((now - created) / 1000);
        const reminderSeconds = reminderTime * 60;

        if (elapsedSeconds < reminderSeconds) {
            // Tiempo restante hasta el recordatorio
            const remainingSeconds = reminderSeconds - elapsedSeconds;
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            return `${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`;
        } else {
            // Tiempo transcurrido desde el recordatorio
            const overdue = elapsedSeconds - reminderSeconds;
            const minutes = Math.floor(overdue / 60);
            const seconds = overdue % 60;
            return `+${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`;
        }
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
                    Cobrando: {quantity} {saleType === 'carton' ? 'Cartones' : saleType === 'half_carton' ? 'Medios Cartones' : 'Cajas'}
                </Text>
                <Text style={styles.paymentSubHeaderText}>
                    {pendingPaymentId ? 'Procesando cobro pendiente - Seleccione método de pago' : 'Seleccione método de pago'}
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

            {/* Nuevo botón de cobro pendiente */}
            <View style={styles.pendingPaymentContainer}>
                <TouchableOpacity
                    style={styles.pendingPaymentButton}
                    onPress={() => setShowPendingPaymentModal(true)}
                >
                    <Text style={styles.pendingPaymentText}>Cobro Pendiente</Text>
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
                onPress={async () => {
                    // Si había un pago pendiente siendo procesado, reanudar las notificaciones
                    if (pendingPaymentId) {
                        await resumePaymentNotifications(pendingPaymentId);
                        setPendingPaymentId(null);
                    }
                    setStep('quantity');
                }}
            >
                <Text style={styles.backButtonText}>Volver</Text>
            </TouchableOpacity>
        </View>
    );

    // Renderizado del modal de cobro pendiente
    const renderPendingPaymentModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showPendingPaymentModal}
            onRequestClose={() => setShowPendingPaymentModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>🕐 Cobro Pendiente</Text>

                    {/* Explicación */}
                    <View style={styles.explanationContainer}>
                        <Text style={styles.explanationText}>
                            Esta opción te permite programar un recordatorio para volver a cobrar esta venta más tarde.
                        </Text>
                        <Text style={styles.explanationSubText}>
                            Recibirás una notificación después del tiempo seleccionado.
                        </Text>
                    </View>

                    {/* Resumen de la venta */}
                    <View style={styles.pendingSaleInfo}>
                        <Text style={styles.pendingSaleTitle}>Resumen de la venta:</Text>
                        <Text style={styles.pendingSaleDetail}>
                            {quantity} {saleType === 'carton' ? 'cartón(es)' :
                                saleType === 'half_carton' ? 'medio(s) cartón(es)' :
                                    'caja(s)'}
                        </Text>
                        <Text style={styles.pendingSaleTotal}>Total: ${total.toFixed(2)}</Text>
                    </View>

                    {/* Selector de tiempo */}
                    <View style={styles.timeSelectionContainer}>
                        <Text style={styles.timeSelectionLabel}>Recordar en:</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={selectedTime}
                                onValueChange={(itemValue) => setSelectedTime(itemValue)}
                                style={styles.picker}
                                itemStyle={styles.pickerItem}
                            >
                                <Picker.Item label="5 minutos" value={5} />
                                <Picker.Item label="10 minutos" value={10} />
                                <Picker.Item label="15 minutos" value={15} />
                                <Picker.Item label="30 minutos" value={30} />
                                <Picker.Item label="60 minutos" value={60} />
                            </Picker>
                        </View>
                    </View>

                    {/* Botones */}
                    <View style={styles.modalButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.cancelButton]}
                            onPress={() => setShowPendingPaymentModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.confirmButton]}
                            onPress={handlePendingPayment}
                        >
                            <Text style={styles.modalButtonText}>Programar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
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

    // Renderizado de la lista de cobros pendientes
    const renderPendingPaymentsList = () => (
        <View style={styles.stepContainer}>
            <View style={styles.pendingListHeader}>
                <Text style={styles.pendingListTitle}>Lista de Cobros Pendientes</Text>
                <TouchableOpacity
                    style={styles.backToPendingButton}
                    onPress={() => setStep('quantity')}
                >
                    <Text style={styles.backToPendingButtonText}>Volver</Text>
                </TouchableOpacity>
            </View>

            {pendingPayments.length === 0 ? (
                <View style={styles.noPendingContainer}>
                    <Text style={styles.noPendingText}>No hay cobros pendientes</Text>
                </View>
            ) : (
                <ScrollView style={styles.pendingPaymentsList} showsVerticalScrollIndicator={false}>
                    {pendingPayments.map((payment) => (
                        <View key={payment.id} style={styles.pendingPaymentItem}>
                            <View style={styles.pendingPaymentInfo}>
                                <Text style={styles.pendingPaymentTitle}>
                                    {payment.quantity} {payment.saleType === 'carton' ? 'Cartón(es)' :
                                        payment.saleType === 'half_carton' ? 'Medio(s) Cartón(es)' :
                                            'Caja(s)'}
                                </Text>
                                <Text style={styles.pendingPaymentAmount}>
                                    ${payment.total.toFixed(2)}
                                </Text>
                                <Text style={styles.pendingPaymentLocation}>
                                    📍 {payment.location}
                                </Text>
                                <View style={styles.pendingPaymentTimer}>
                                    <Text style={styles.pendingPaymentTimerText}>
                                        ⏱️ {formatCounterTime(payment.createdAt, payment.reminderTime)}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.pendingPaymentActions}>
                                <TouchableOpacity
                                    style={[styles.pendingActionButton, styles.completedButton]}
                                    onPress={() => handlePaymentCompleted(payment.id)}
                                >
                                    <Text style={styles.pendingActionButtonText}>
                                        Cobro Realizado
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.pendingActionButton, styles.cancelledButton]}
                                    onPress={() => handlePaymentCancelled(payment.id)}
                                >
                                    <Text style={styles.pendingActionButtonText}>
                                        Cobro Cancelado
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </View>
    );

    // Renderizado del modal de confirmación de cancelación
    const renderCancelConfirmationModal = () => (
        <Modal
            animationType="slide"
            transparent={true}
            visible={showCancelModal}
            onRequestClose={() => setShowCancelModal(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>⚠️ Confirmar Cancelación</Text>

                    <View style={styles.cancelWarningContainer}>
                        <Text style={styles.cancelWarningText}>
                            ¿Estás seguro de que quieres cancelar este cobro pendiente?
                        </Text>
                        <Text style={styles.cancelWarningSubText}>
                            Esta acción confirmará que el pedido fue cancelado y cerrará el recordatorio permanentemente.
                        </Text>
                    </View>

                    {cancelingPayment && (
                        <View style={styles.cancelPaymentDetails}>
                            <Text style={styles.cancelPaymentTitle}>Detalles del cobro:</Text>
                            <Text style={styles.cancelPaymentInfo}>
                                • {cancelingPayment.quantity} {cancelingPayment.saleType === 'carton' ? 'Cartón(es)' :
                                    cancelingPayment.saleType === 'half_carton' ? 'Medio(s) Cartón(es)' :
                                        'Caja(s)'}
                            </Text>
                            <Text style={styles.cancelPaymentInfo}>
                                • Total: ${cancelingPayment.total.toFixed(2)}
                            </Text>
                            <Text style={styles.cancelPaymentInfo}>
                                • Ubicación: {cancelingPayment.location}
                            </Text>
                        </View>
                    )}

                    <View style={styles.modalButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.modalButton, styles.keepButton]}
                            onPress={() => setShowCancelModal(false)}
                        >
                            <Text style={styles.modalButtonText}>Mantener</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalButton, styles.confirmCancelButton]}
                            onPress={confirmCancelPayment}
                        >
                            <Text style={styles.modalButtonText}>Cancelar Cobro</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    return (
        <SafeAreaView style={styles.safeContainer} edges={['bottom']}>
            {/* Botón para ver lista de cobros pendientes */}
            {pendingPayments.length > 0 && step !== 'pending_list' && (
                <View style={styles.pendingPaymentsIndicator}>
                    <TouchableOpacity
                        style={styles.pendingPaymentsButton}
                        onPress={() => setStep('pending_list')}
                    >
                        <Text style={styles.pendingPaymentsButtonText}>
                            📋 Ver Cobros Pendientes ({pendingPayments.length})
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {step === 'quantity' ? renderQuantityStep() :
                    step === 'payment' ? renderPaymentStep() :
                        renderPendingPaymentsList()}
                {renderCompositePaymentModal()}
                {renderPendingPaymentModal()}
                {renderConfirmationModal()}
                {renderCancelConfirmationModal()}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollContainer: {
        flexGrow: 1,
        padding: 20,
    },
    stepContainer: {
        flex: 1,
        justifyContent: 'space-between',
    },
    ventaTypeSelector: {
        flexDirection: 'row',
        marginBottom: 20,
        borderRadius: 10,
        overflow: 'hidden',
        backgroundColor: COLORS.card,
    },
    ventaTypeButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedVentaTypeButton: {
        backgroundColor: COLORS.primary,
    },
    ventaTypeButtonText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    selectedVentaTypeButtonText: {
        color: COLORS.text,
    },
    typeSelector: {
        flexDirection: 'row',
        marginBottom: 20,
        borderRadius: 10,
        overflow: 'hidden',
    },
    typeButton: {
        flex: 1,
        paddingVertical: 12,
        backgroundColor: COLORS.card,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    selectedTypeButton: {
        backgroundColor: COLORS.primary,
    },
    typeButtonText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        fontWeight: '600',
    },
    selectedTypeButtonText: {
        color: COLORS.text,
    },
    quantitySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    quantityButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 20,
    },
    quantityButtonText: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    quantityValueContainer: {
        minWidth: 80,
        padding: 20,
        backgroundColor: COLORS.card,
        borderRadius: 10,
        alignItems: 'center',
    },
    quantityValue: {
        color: COLORS.text,
        fontSize: 32,
        fontWeight: 'bold',
    },
    summaryContainer: {
        backgroundColor: COLORS.card,
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
    },
    priceText: {
        color: COLORS.textSecondary,
        fontSize: 16,
        marginBottom: 10,
    },
    totalText: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    continueButton: {
        backgroundColor: COLORS.secondary,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    continueButtonText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    disabledButton: {
        backgroundColor: COLORS.textSecondary,
        opacity: 0.5,
    },
    paymentHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    paymentHeaderText: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    paymentSubHeaderText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    specialPaymentContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    specialPaymentButton: {
        flex: 1,
        backgroundColor: COLORS.accent,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    specialPaymentText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    pendingPaymentContainer: {
        marginBottom: 20,
    },
    pendingPaymentButton: {
        backgroundColor: COLORS.warning,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    pendingPaymentText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    billsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    billButton: {
        width: '30%',
        backgroundColor: COLORS.card,
        paddingVertical: 20,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    billValue: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    billCount: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginTop: 5,
    },
    receivedSummary: {
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    receivedText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    changeText: {
        fontSize: 16,
        fontWeight: '600',
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
        marginBottom: 20,
    },
    resetButton: {
        flex: 1,
        backgroundColor: COLORS.textSecondary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginRight: 10,
    },
    resetButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    confirmButton: {
        flex: 1,
        backgroundColor: COLORS.success,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 10,
    },
    confirmButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        backgroundColor: COLORS.card,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    backButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: COLORS.card,
        borderRadius: 15,
        padding: 25,
        width: '90%',
        maxWidth: 400,
    },
    modalTitle: {
        color: COLORS.text,
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    explanationContainer: {
        backgroundColor: COLORS.background,
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    explanationText: {
        color: COLORS.text,
        fontSize: 16,
        lineHeight: 22,
        marginBottom: 8,
    },
    explanationSubText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    pendingSaleInfo: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    pendingSaleTitle: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    pendingSaleDetail: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 4,
    },
    pendingSaleTotal: {
        color: COLORS.secondary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    timeSelectionContainer: {
        marginBottom: 25,
    },
    timeSelectionLabel: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
    },
    pickerContainer: {
        backgroundColor: COLORS.background,
        borderRadius: 10,
        overflow: 'hidden',
    },
    picker: {
        color: COLORS.text,
    },
    pickerItem: {
        color: COLORS.text,
        fontSize: 16,
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 15,
        color: COLORS.text,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    changePreview: {
        color: COLORS.success,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: COLORS.textSecondary,
    },
    modalButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    enhancedModalContent: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 30,
        width: '95%',
        maxWidth: 450,
        alignItems: 'center',
    },
    confirmationIconContainer: {
        marginBottom: 20,
    },
    confirmationIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    confirmationIconText: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
    },
    enhancedModalTitle: {
        color: COLORS.text,
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    enhancedModalSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 25,
    },
    enhancedConfirmationDetails: {
        width: '100%',
        marginBottom: 25,
    },
    saleDetailCard: {
        backgroundColor: COLORS.background,
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
    },
    saleDetailTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    saleDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    saleDetailLabel: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    saleDetailValue: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    saleDetailTotalValue: {
        color: COLORS.secondary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    paymentInfoCard: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 12,
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
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 5,
    },
    paymentInfoValue: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    exactPayment: {
        color: COLORS.success,
    },
    changeAmount: {
        color: COLORS.secondary,
    },
    enhancedModalButtonsContainer: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
    },
    enhancedModalButton: {
        flex: 1,
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 8,
    },
    enhancedCancelButton: {
        backgroundColor: COLORS.textSecondary,
    },
    enhancedConfirmButton: {
        backgroundColor: COLORS.success,
    },
    enhancedCancelButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '600',
    },
    enhancedConfirmButtonText: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    pendingPaymentsIndicator: {
        backgroundColor: COLORS.warning,
        padding: 10,
        margin: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    pendingPaymentsButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
    },
    pendingPaymentsButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 14,
    },
    pendingListHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    pendingListTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    backToPendingButton: {
        backgroundColor: COLORS.secondary,
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 6,
    },
    backToPendingButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
    },
    noPendingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 50,
    },
    noPendingText: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    pendingPaymentsList: {
        flex: 1,
    },
    pendingPaymentItem: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
    },
    pendingPaymentInfo: {
        marginBottom: 15,
    },
    pendingPaymentTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 5,
    },
    pendingPaymentAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.success,
        marginBottom: 5,
    },
    pendingPaymentLocation: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 10,
    },
    pendingPaymentTimer: {
        backgroundColor: COLORS.warning,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        alignSelf: 'flex-start',
    },
    pendingPaymentTimerText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
    pendingPaymentActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    pendingActionButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    completedButton: {
        backgroundColor: COLORS.success,
    },
    cancelledButton: {
        backgroundColor: COLORS.error,
    },
    pendingActionButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 12,
    },
    cancelWarningContainer: {
        backgroundColor: '#FFF3E0',
        padding: 15,
        borderRadius: 8,
        marginVertical: 15,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.warning,
    },
    cancelWarningText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 8,
    },
    cancelWarningSubText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    cancelPaymentDetails: {
        backgroundColor: '#F5F5F5',
        padding: 15,
        borderRadius: 8,
        marginBottom: 15,
    },
    cancelPaymentTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.primary,
        marginBottom: 8,
    },
    cancelPaymentInfo: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 4,
    },
    keepButton: {
        backgroundColor: COLORS.secondary,
    },
    confirmCancelButton: {
        backgroundColor: COLORS.error,
    },
});

export default SaleCalculator;