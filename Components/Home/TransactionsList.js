// Components/Home/TransactionsList.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, formatDate } from '../Utils/Constants';
import { generatePDFContent, customFormatTime } from '../Utils/pdfFormat';





// Componente para mostrar la lista de transacciones
const TransactionsList = ({ transactions, sale, purchasePrice, showAnalysis }) => {
    // Verificación si no hay transacciones
    if (!transactions || transactions.length === 0) {
        return (
            <SafeAreaView style={styles.safeContainer} edges={['bottom']}>
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No hay transacciones registradas</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Calcular el total de ventas
    const totalSales = transactions.reduce((sum, transaction) => sum + transaction.total, 0);
    const [menuOpen, setMenuOpen] = React.useState(false);

    // Función para ordenar transacciones con las más recientes primero
    const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    // Función para calcular análisis de una transacción específica
    const calculateTransactionAnalysis = (transaction) => {
        const sellPrice = transaction.total; // Precio total de venta
        let costPrice = 0;

        // Calcular el costo basado en el tipo de transacción
        if (transaction.type === 'carton') {
            costPrice = (purchasePrice / 12) * transaction.quantity; // Costo por cartones
        } else if (transaction.type === 'half_carton') {
            costPrice = (purchasePrice / 24) * transaction.quantity; // Costo por medios cartones
        } else if (transaction.type === 'box') {
            costPrice = purchasePrice * transaction.quantity; // Costo por cajas
        }

        const profit = sellPrice - costPrice; // Ganancia obtenida
        const profitPercentage = costPrice > 0 ? ((profit / costPrice) * 100) : 0; // Porcentaje de ganancia

        return {
            sellPrice,
            costPrice,
            profit,
            profitPercentage
        };
    };

    // Función para guardar el PDF en el dispositivo
    const savePDF = async () => {
        try {
            const pdfContent = generatePDFContent(sale, sortedTransactions);

            // Generar el PDF
            const { uri } = await Print.printToFileAsync({ html: pdfContent });

            // Formatear la fecha para el nombre del archivo
            const date = new Date();
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear().toString();

            // Formatear la hora para el nombre del archivo
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const seconds = date.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'PM' : 'AM';

            hours = hours % 12;
            hours = hours ? hours : 12; // la hora '0' debe ser '12'
            const formattedHours = hours.toString().padStart(2, '0');

            const timeString = `${formattedHours}:${minutes}:${seconds} ${ampm}`;

            // Directorio destino
            const destinationDir = FileSystem.documentDirectory + 'Huevos La Rural/';

            // Crear directorio si no existe
            try {
                const dirInfo = await FileSystem.getInfoAsync(destinationDir);
                if (!dirInfo.exists) {
                    await FileSystem.makeDirectoryAsync(destinationDir, { intermediates: true });
                }
            } catch (error) {
                console.error('Error al crear directorio:', error);
            }

            // Nombre del archivo con la hora incluida
            const fileName = `${day}_${month}_${year} ${timeString} - Registro de venta.pdf`;
            const filePath = destinationDir + fileName;

            // Mover el archivo
            await FileSystem.moveAsync({
                from: uri,
                to: filePath
            });

            // Compartir el archivo
            await Sharing.shareAsync(filePath);

            Alert.alert(
                "PDF Guardado",
                `El PDF ha sido guardado como "${fileName}" y compartido.`,
                [{ text: "OK" }]
            );
        } catch (error) {
            console.error('Error al generar o guardar PDF:', error);
            Alert.alert(
                "Error",
                "Ocurrió un error al guardar el PDF. Intente nuevamente.",
                [{ text: "OK" }]
            );
        }
    };

    return (
        <SafeAreaView style={styles.safeContainer} edges={['bottom']}>
            <View style={styles.container}>
                <View style={styles.menuContainer}>
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => setMenuOpen(!menuOpen)}>
                        <Text style={styles.menuButtonText}>
                            {menuOpen ? "Cerrar menú" : "Abrir menú"}
                        </Text>
                    </TouchableOpacity>

                    {menuOpen && (
                        <View style={styles.submenuContainer}>
                            <TouchableOpacity style={styles.pdfButton} onPress={savePDF}>
                                <Text style={styles.pdfButtonText}>Guardar registro PDF</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <ScrollView style={styles.transactionsList}>
                    {sortedTransactions.map((transaction) => (
                        <View key={transaction.id} style={styles.transactionItem}>
                            <View style={styles.transactionHeader}>
                                <Text style={styles.transactionType}>
                                    {transaction.type === 'carton' ? 'Cartones' : transaction.type === 'half_carton' ? 'Medios Cartones' : 'Cajas'}
                                </Text>
                                <Text style={styles.transactionDate}>
                                    {formatDate(transaction.timestamp)} {customFormatTime(transaction.timestamp)}
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

                                {/* Añadir la ubicación de la venta */}
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Ubicación:</Text>
                                    <Text style={[styles.detailValue, styles.locationValue]}>
                                        {transaction.location || 'No especificada'}
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Tipo de venta:</Text>
                                    <Text style={styles.detailValue}>{transaction.saleType || 'No especificado'}</Text>
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

                            {/* Análisis de transacción condicional */}
                            {/* Análisis de transacción condicional */}
                            {showAnalysis && (
                                <View style={styles.transactionAnalysisContainer}>
                                    <View style={styles.analysisHeader}>
                                        <Text style={styles.transactionAnalysisTitle}>Análisis de esta transacción</Text>
                                    </View>

                                    {(() => {
                                        const analysis = calculateTransactionAnalysis(transaction);
                                        return (
                                            <View style={styles.transactionAnalysisContent}>
                                                {/* Sección de Costos */}
                                                <View style={styles.analysisSection}>
                                                    <View style={styles.analysisSectionHeader}>
                                                        <Text style={styles.sectionTitle}>Costos y Ventas</Text>
                                                    </View>

                                                    <View style={styles.analysisCard}>
                                                        <View style={styles.analysisRow}>
                                                            <Text style={styles.analysisLabel}>Costo de productos</Text>
                                                            <View style={styles.costValueContainer}>
                                                                <Text style={styles.costValue}>
                                                                    ${analysis.costPrice.toFixed(2)}
                                                                </Text>
                                                            </View>
                                                        </View>

                                                        <View style={styles.analysisRow}>
                                                            <Text style={styles.analysisLabel}>Precio de venta</Text>
                                                            <View style={styles.saleValueContainer}>
                                                                <Text style={styles.saleValue}>
                                                                    ${analysis.sellPrice.toFixed(2)}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* Sección de Ganancias */}
                                                <View style={styles.analysisSection}>
                                                    <View style={styles.analysisSectionHeader}>
                                                        <Text style={styles.sectionTitle}>
                                                            {analysis.profit >= 0 ? 'Hubo Ganancias' : 'Hubo Pérdidas'}
                                                        </Text>
                                                    </View>

                                                    <View style={[
                                                        styles.profitCard,
                                                        analysis.profit >= 0 ? styles.profitCardPositive : styles.profitCardNegative
                                                    ]}>
                                                        <View style={styles.profitMainRow}>
                                                            <Text style={styles.profitMainLabel}>Ganancia Total</Text>
                                                            <Text style={[
                                                                styles.profitMainValue,
                                                                analysis.profit >= 0 ? styles.profitPositive : styles.profitNegative
                                                            ]}>
                                                                ${analysis.profit.toFixed(2)}
                                                            </Text>
                                                        </View>

                                                        <View style={styles.profitPercentageRow}>
                                                            <Text style={styles.profitPercentageLabel}>Margen de ganancia</Text>
                                                            <View style={[
                                                                styles.percentageBadge,
                                                                analysis.profitPercentage >= 0 ? styles.percentageBadgePositive : styles.percentageBadgeNegative
                                                            ]}>
                                                                <Text style={[
                                                                    styles.profitPercentageValue,
                                                                    analysis.profitPercentage >= 0 ? styles.profitPositive : styles.profitNegative
                                                                ]}>
                                                                    {analysis.profitPercentage.toFixed(1)}%
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })()}
                                </View>
                            )}
                        </View>
                    ))}
                </ScrollView>

                <View style={styles.totalContainer}>
                    <Text style={styles.totalLabel}>Total Ventas:</Text>
                    <Text style={styles.totalValue}>${totalSales.toFixed(2)}</Text>
                </View>
            </View>
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
        paddingHorizontal: 10,
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
        marginBottom: 10,
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
    locationValue: {
        color: COLORS.accent,
        fontWeight: 'bold',
    },
    pdfButton: {
        backgroundColor: COLORS.accent,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
    },
    pdfButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    menuContainer: {
        marginBottom: 10,
    },
    menuButton: {
        backgroundColor: COLORS.primary,
        padding: 8,
        borderRadius: 6,
        alignItems: 'center',
    },
    menuButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 14,
    },
    submenuContainer: {
        marginTop: 8,
    },
    transactionAnalysisContainer: {
        marginTop: 15,
        backgroundColor: COLORS.background,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        overflow: 'hidden',
    },
    analysisHeader: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    transactionAnalysisTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
    },
    transactionAnalysisContent: {
        padding: 15,
    },
    analysisSection: {
        marginBottom: 15,
    },
    analysisSectionHeader: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.secondary,
        marginBottom: 5,
    },
    analysisCard: {
        backgroundColor: COLORS.card,
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accent,
    },
    analysisRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border + '30',
    },
    analysisLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
        flex: 1,
    },
    costValueContainer: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    costValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.warning,
    },
    saleValueContainer: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    saleValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.accent,
    },
    profitCard: {
        borderRadius: 8,
        padding: 15,
        borderLeftWidth: 4,
    },
    profitCardPositive: {
        backgroundColor: COLORS.success + '15',
        borderLeftColor: COLORS.success,
    },
    profitCardNegative: {
        backgroundColor: COLORS.error + '15',
        borderLeftColor: COLORS.error,
    },
    profitMainRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    profitMainLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    profitMainValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    profitPercentageRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    profitPercentageLabel: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    percentageBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
        minWidth: 60,
        alignItems: 'center',
    },
    percentageBadgePositive: {
        backgroundColor: COLORS.success + '25',
    },
    percentageBadgeNegative: {
        backgroundColor: COLORS.error + '25',
    },
    profitPercentageValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    profitPositive: {
        color: COLORS.success,
    },
    profitNegative: {
        color: COLORS.error,
    },
});

export default TransactionsList;