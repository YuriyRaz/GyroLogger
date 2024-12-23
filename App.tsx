import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import {
  accelerometer,
  gyroscope,
  setUpdateIntervalForType,
  SensorTypes
} from 'react-native-sensors';

export default function App() {
  const [accData, setAccData] = useState([] as Array<{ x: number, y: number, z: number }>);
  const [gyroData, setGyroData] = useState([] as Array<{ x: number, y: number, z: number }>);

  useEffect(() => {
    // Set update intervals (milliseconds)
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

  const renderItem = ({ item }) => (
    <Text style={styles.itemText}>
      x: {item.x.toFixed(2)}, y: {item.y.toFixed(2)}, z: {item.z.toFixed(2)}
    </Text>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Accelerometer (last 10)</Text>
      <FlatList
        style={styles.list}
        data={accData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `acc-${index}`}
      />

      <Text style={styles.header}>Gyroscope (last 10)</Text>
      <FlatList
        style={styles.list}
        data={gyroData}
        renderItem={renderItem}
        keyExtractor={(item, index) => `gyro-${index}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    backgroundColor: '#fff'
  },
  header: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 16,
    marginVertical: 10
  },
  list: {
    marginHorizontal: 16
  },
  itemText: {
    fontSize: 16,
    marginBottom: 5
  }
});
