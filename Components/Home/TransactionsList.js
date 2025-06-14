// Components/Home/TransactionsList.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { COLORS, formatDate } from '../Utils/Constants';
import { generatePDFContent, customFormatTime } from '../Utils/pdfFormat';





// Componente para mostrar la lista de transacciones
const TransactionsList = ({ transactions, sale }) => {
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
    const [menuOpen, setMenuOpen] = React.useState(false);

    // Función para ordenar transacciones con las más recientes primero
    const sortedTransactions = [...transactions].sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

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
        marginHorizontal: 10,
    },
    pdfButtonText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    menuContainer: {
        marginBottom: 10,
        marginHorizontal: 10,
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
});

export default TransactionsList;