// Components/Home/TransactionsList.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import { COLORS, formatTime, formatDate } from '../Utils/Constants';





// Componente para mostrar la lista de transacciones
const TransactionsList = ({ transactions }) => {
    // Verificación si no hay transacciones
    if (!transactions || transactions.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay transacciones registradas</Text>
            </View>
        );
    }

    // Calcular el total de ventas
    const totalSales = transactions.reduce((sum, transaction) => sum + transaction.total, 0);

    // Función para ordenar transacciones con las más recientes primero
    const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return (
        <View style={styles.container}>
            <ScrollView style={styles.transactionsList}>
                {sortedTransactions.map((transaction) => (
                    <View key={transaction.id} style={styles.transactionItem}>
                        <View style={styles.transactionHeader}>
                            <Text style={styles.transactionType}>
                                {transaction.type === 'carton' ? 'Cartones' : transaction.type === 'half_carton' ? 'Medios Cartones' : 'Cajas'}
                            </Text>
                            <Text style={styles.transactionDate}>
                                {formatDate(transaction.timestamp)} {formatTime(transaction.timestamp)}
                            </Text>
                        </View>

                        <View style={styles.transactionDetails}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Cantidad:</Text>
                                <Text style={styles.detailValue}>{transaction.quantity}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Precio unitario:</Text>
                                <Text style={styles.detailValue}>${transaction.unitPrice.toFixed(2)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Total venta:</Text>
                                <Text style={styles.detailValue}>${transaction.total.toFixed(2)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Recibido:</Text>
                                <Text style={styles.detailValue}>${transaction.totalReceived.toFixed(2)}</Text>
                            </View>

                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Cambio:</Text>
                                <Text style={[styles.detailValue, styles.changeValue]}>
                                    ${transaction.change.toFixed(2)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.billsDetails}>
                            <Text style={styles.billsTitle}>Billetes recibidos:</Text>
                            <View style={styles.billsList}>
                                {Object.entries(transaction.receivedMoney).map(([bill, count]) => (
                                    count > 0 && (
                                        <View key={bill} style={styles.billItem}>
                                            <Text style={styles.billValue}>${bill}</Text>
                                            <Text style={styles.billCount}>x{count}</Text>
                                        </View>
                                    )
                                ))}
                            </View>
                        </View>
                    </View>
                ))}
            </ScrollView>

            <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total Ventas:</Text>
                <Text style={styles.totalValue}>${totalSales.toFixed(2)}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    transactionsList: {
        flex: 1,
    },
    transactionItem: {
        backgroundColor: COLORS.card,
        borderRadius: 8,
        padding: 15,
        marginBottom: 10,
    },
    transactionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    transactionType: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    transactionDate: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    transactionDetails: {
        marginBottom: 10,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
    },
    detailLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    detailValue: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '500',
    },
    changeValue: {
        color: COLORS.success,
    },
    billsDetails: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 10,
    },
    billsTitle: {
        color: COLORS.text,
        fontSize: 14,
        marginBottom: 5,
    },
    billsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    billItem: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginRight: 8,
        marginBottom: 5,
        alignItems: 'center',
    },
    billValue: {
        color: COLORS.accent,
        fontSize: 14,
        fontWeight: '500',
    },
    billCount: {
        color: COLORS.text,
        fontSize: 12,
        marginLeft: 5,
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 5,
        marginTop: 10,
    },
    totalLabel: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    totalValue: {
        color: COLORS.secondary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default TransactionsList;