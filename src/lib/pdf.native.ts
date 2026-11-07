import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function exportPdf(html: string, title: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html });
  await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: title });
}
