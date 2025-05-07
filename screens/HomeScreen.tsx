import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import catechismData from '@/assets/catechism/catechism.json';
import { Catechism } from '@/types/doctrine';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/App';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen = ({ navigation }: Props) => {
  const [data, setData] = useState<Catechism[]>([]);

  useEffect(() => {
    setData(catechismData);
  }, []);

  return (
    <View style={{ padding: 16 }}>
      <FlatList
        data={data}
        keyExtractor={(item) => item.question_number.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('Detail', { questionNumber: item.question_number })
            }
            style={{
              marginBottom: 12,
              padding: 12,
              backgroundColor: '#eee',
              borderRadius: 8
            }}
          >
            <Text>{`Q${item.question_number}. ${item.question}`}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default HomeScreen;
