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

function safeValue(val: number) {
  return (isFinite(val) && !isNaN(val)) ? val : 0;
}

export default function App() {
  // Store the last 10 readings
  const [accData, setAccData] = useState([] as Array<{ x: number, y: number, z: number }>);
  const [gyroData, setGyroData] = useState([] as Array<{ x: number, y: number, z: number }>);

  useEffect(() => {
    // Update intervals in ms
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
    setUpdateIntervalForType(SensorTypes.gyroscope, 100);

    // Accelerometer subscription
    const accSubscription = accelerometer.subscribe(({ x, y, z }) => {
      console.log('acc:', { x, y, z });
      setAccData(prev => {
        const updated = [...prev, { x, y, z }];
        return updated.length > 10 ? updated.slice(-10) : updated;
      });
    });

    // Gyroscope subscription
    const gyroSubscription = gyroscope.subscribe(({ x, y, z }) => {
      console.log('gyro:', { x, y, z });
      setGyroData(prev => {
        const updated = [...prev, { x, y, z }];
        return updated.length > 10 ? updated.slice(-10) : updated;
      });
    });

    // Cleanup on unmount
    return () => {
      accSubscription.unsubscribe();
      gyroSubscription.unsubscribe();
    };
  }, []);

  // Prepare data for charts: separate X, Y, Z
  const accX = accData.map(d => safeValue(d.x));
  const accY = accData.map(d => safeValue(d.y));
  const accZ = accData.map(d => safeValue(d.z));

  const gyroX = gyroData.map(d => safeValue(d.x));
  const gyroY = gyroData.map(d => safeValue(d.y));
  const gyroZ = gyroData.map(d => safeValue(d.z));

  // We'll label last 10 points 1..10 (oldest -> newest)
  const chartLabels = Array.from({ length: 10 }, (_, i) => `${i + 1}`);

  const renderChart = (
    title: string,
    xArr: number[],
    yArr: number[],
    zArr: number[]
  ) => {
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <LineChart
          data={{
            labels: chartLabels,
            datasets: [
              { data: xArr, color: () => 'red', strokeWidth: 2 },
              { data: yArr, color: () => 'blue', strokeWidth: 2 },
              { data: zArr, color: () => 'green', strokeWidth: 2 }
            ],
            // Optionally add a legend:
            legend: ['X', 'Y', 'Z']
          }}
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
        />
      </View>
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* {renderChart('Accelerometer', accX, accY, accZ)}
      {renderChart('Gyroscope', gyroX, gyroY, gyroZ)} */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff'
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
