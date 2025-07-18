import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Button
} from 'react-native';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes
} from 'react-native-sensors';
import { LineChart } from 'react-native-chart-kit';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const MAX_POINTS = 20;

// Safeguard a single numeric value
function safeValue(val: number): number {
  return Number.isFinite(val) ? val : 0;
}

// Normalize arrays to the same length = MAX_POINTS, clamp or pad with zeros
function normalizeArrays(arrays: number[][], maxLength: number): number[][] {
  return arrays.map(arr => {
    const clamped = arr.map(safeValue);
    if (clamped.length > maxLength) {
      return clamped.slice(clamped.length - maxLength);
    }
    if (clamped.length < maxLength) {
      const missing = maxLength - clamped.length;
      const padding = Array(missing).fill(0);
      return [...padding, ...clamped];
    }
    return clamped;
  });
}

// Generate a file-friendly timestamp string
function createTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export default function App() {
  // Sensor raw data
  const [accData, setAccData] = useState<Array<{ x: number; y: number; z: number }>>([]);
  const [gyroData, setGyroData] = useState<Array<{ x: number; y: number; z: number }>>([]);

  // Paths to the .log files we will write
  const [accLogPath, setAccLogPath] = useState<string>('');
  const [gyroLogPath, setGyroLogPath] = useState<string>('');

  // Whether we are currently logging
  const [isLogging, setIsLogging] = useState<boolean>(false);

  useEffect(() => {
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
    setUpdateIntervalForType(SensorTypes.gyroscope, 100);

    const accSubscription = accelerometer.subscribe(({ x, y, z }) => {
      // Update chart data
      setAccData(prev => {
        const updated = [...prev, { x, y, z }];
        return updated.length > MAX_POINTS ? updated.slice(-MAX_POINTS) : updated;
      });

      // If logging, append to file
      if (isLogging && accLogPath) {
        const logLine = `${Date.now()},${x},${y},${z}\n`;
        RNFS.appendFile(accLogPath, logLine, 'utf8').catch(err => console.log('ACC append error:', err));
      }
    });

    const gyroSubscription = gyroscope.subscribe(({ x, y, z }) => {
      // Update chart data
      setGyroData(prev => {
        const updated = [...prev, { x, y, z }];
        return updated.length > MAX_POINTS ? updated.slice(-MAX_POINTS) : updated;
      });

      // If logging, append to file
      if (isLogging && gyroLogPath) {
        const logLine = `${Date.now()},${x},${y},${z}\n`;
        RNFS.appendFile(gyroLogPath, logLine, 'utf8').catch(err => console.log('GYRO append error:', err));
      }
    });

    return () => {
      accSubscription.unsubscribe();
      gyroSubscription.unsubscribe();
    };
  }, [isLogging, accLogPath, gyroLogPath]);

  // Separate x, y, z for charts
  const accX = accData.map(d => d.x);
  const accY = accData.map(d => d.y);
  const accZ = accData.map(d => d.z);

  const gyroX = gyroData.map(d => d.x);
  const gyroY = gyroData.map(d => d.y);
  const gyroZ = gyroData.map(d => d.z);

  // Force arrays to the same length
  const [accXNorm, accYNorm, accZNorm] = normalizeArrays([accX, accY, accZ], MAX_POINTS);
  const [gyroXNorm, gyroYNorm, gyroZNorm] = normalizeArrays([gyroX, gyroY, gyroZ], MAX_POINTS);

  // Chart labels 1..10
  const chartLabels = Array.from({ length: MAX_POINTS }, (_, i) => `${i + 1}`);

  // Minimal line chart
  const renderChart = (title: string, xArr: number[], yArr: number[], zArr: number[]) => {
    const data = {
      labels: chartLabels,
      datasets: [
        { data: xArr, color: () => 'red', strokeWidth: 2 },
        { data: yArr, color: () => 'blue', strokeWidth: 2 },
        { data: zArr, color: () => 'green', strokeWidth: 2 },
      ],
      legend: ['X', 'Y', 'Z']
    };
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <LineChart
          data={data}
          width={Dimensions.get('window').width * 0.9}
          height={220}
          chartConfig={{
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            decimalPlaces: 2
          }}
          style={{ marginVertical: 8 }}
        // bezier // (Optional)
        />
      </View>
    );
  };

  /**
   * Toggle logging:
   * - If we start logging, create new files with timestamped names.
   * - If we stop, just set isLogging to false.
   */
  const handleToggleLogging = async () => {
    if (!isLogging) {
      // Starting log
      const time = createTimestamp();
      const accFileName = `${time}_acc.log`;
      const gyroFileName = `${time}_gyro.log`;

      // Use app’s document directory or external directory
      const pathAcc = `${RNFS.DocumentDirectoryPath}/${accFileName}`;
      const pathGyro = `${RNFS.DocumentDirectoryPath}/${gyroFileName}`;

      // Create empty files
      try {
        await RNFS.writeFile(pathAcc, 'timestamp,x,y,z\n', 'utf8');
        await RNFS.writeFile(pathGyro, 'timestamp,x,y,z\n', 'utf8');
        setAccLogPath(pathAcc);
        setGyroLogPath(pathGyro);
      } catch (err) {
        console.log('File create error:', err);
      }
      setIsLogging(true);
    } else {
      // Stopping log
      setIsLogging(false);
    }
  };

  /**
   * Simple share method. This uses `react-native-share`:
   * - The user can choose how to transfer the files
   *   (e.g., email, airdrop, etc.)
   */
  const handleShareLogs = async () => {
    if (!accLogPath || !gyroLogPath) return;

    try {
      await Share.open({
        title: 'Share logs',
        message: 'Choose a method to share the sensor logs.',
        urls: [
          'file://' + accLogPath,
          'file://' + gyroLogPath
        ]
      });
    } catch (err) {
      console.log('Share error:', err);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.buttonContainer}>
        <Button
          title={isLogging ? 'Stop Logging' : 'Start Logging'}
          onPress={handleToggleLogging}
        />
        <Button
          title="Share Logs"
          onPress={handleShareLogs}
          disabled={!accLogPath && !gyroLogPath}
        />
      </View>

      {renderChart('Accelerometer', accXNorm, accYNorm, accZNorm)}
      {renderChart('Gyroscope', gyroXNorm, gyroYNorm, gyroZNorm)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    width: '100%'
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '80%',
    marginBottom: 20
  }
});
