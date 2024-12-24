import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView
} from 'react-native';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes
} from 'react-native-sensors';
import { LineChart } from 'react-native-chart-kit';

const MAX_POINTS = 10; // We'll keep 10 points in our arrays

// Clamp / sanitize a single numeric value
function safeValue(val: number): number {
  // If it's NaN, Infinity, or -Infinity, return 0
  return Number.isFinite(val) ? val : 0;
}

/**
 * Ensure each array in `arrays` has exactly `maxLength` items.
 * - If an array is longer, slice from the end.
 * - If shorter, pad the front with zeroes.
 * Also apply `safeValue()` to each item.
 */
function normalizeArrays(
  arrays: number[][],
  maxLength: number
): number[][] {
  return arrays.map(arr => {
    // 1) Apply safeValue to each item
    const clamped = arr.map(safeValue);

    // 2) If array is longer than needed, trim from the end
    if (clamped.length > maxLength) {
      return clamped.slice(clamped.length - maxLength);
    }

    // 3) If array is shorter, pad at the front
    if (clamped.length < maxLength) {
      const missing = maxLength - clamped.length;
      const padding = Array(missing).fill(0);
      return [...padding, ...clamped];
    }

    // 4) Otherwise, array is already the desired length
    return clamped;
  });
}

export default function App() {
  // Store the raw sensor readings
  const [accData, setAccData] = useState<{ x: number; y: number; z: number }[]>([]);
  const [gyroData, setGyroData] = useState<{ x: number; y: number; z: number }[]>([]);

  useEffect(() => {
    // Set sensor update intervals
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
    setUpdateIntervalForType(SensorTypes.gyroscope, 100);

    // Subscribe to accelerometer
    const accSubscription = accelerometer.subscribe(({ x, y, z }) => {
      setAccData(prev => {
        const updated = [...prev, { x, y, z }];
        return updated.length > MAX_POINTS
          ? updated.slice(updated.length - MAX_POINTS)
          : updated;
      });
    });

    // Subscribe to gyroscope
    const gyroSubscription = gyroscope.subscribe(({ x, y, z }) => {
      setGyroData(prev => {
        const updated = [...prev, { x, y, z }];
        return updated.length > MAX_POINTS
          ? updated.slice(updated.length - MAX_POINTS)
          : updated;
      });
    });

    return () => {
      accSubscription.unsubscribe();
      gyroSubscription.unsubscribe();
    };
  }, []);

  // Separate X, Y, Z into arrays
  const accX = accData.map(d => d.x);
  const accY = accData.map(d => d.y);
  const accZ = accData.map(d => d.z);

  const gyroX = gyroData.map(d => d.x);
  const gyroY = gyroData.map(d => d.y);
  const gyroZ = gyroData.map(d => d.z);

  // Normalize all arrays to length = MAX_POINTS
  const [accXNorm, accYNorm, accZNorm] = normalizeArrays([accX, accY, accZ], MAX_POINTS);
  const [gyroXNorm, gyroYNorm, gyroZNorm] = normalizeArrays([gyroX, gyroY, gyroZ], MAX_POINTS);

  // Labels: 1..MAX_POINTS
  const chartLabels = Array.from({ length: MAX_POINTS }, (_, i) => `${i + 1}`);

  const renderChart = (title: string, xArr: number[], yArr: number[], zArr: number[]) => {
    // Build data object
    const data = {
      labels: chartLabels,
      datasets: [
        { data: xArr, color: () => 'red', strokeWidth: 2 },
        { data: yArr, color: () => 'blue', strokeWidth: 2 },
        { data: zArr, color: () => 'green', strokeWidth: 2 },
      ],
      legend: ['X', 'Y', 'Z']
    };

    // Log the final data to confirm no Infinity/NaN
    console.log(`${title} CHART DATA:`, data);

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
          // Removing bezier if it causes issues, but you can use it:
          // bezier
          style={{ marginVertical: 8 }}
        />
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
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
    // Ensure we have a layout that isn't zero width or height
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
  }
});
