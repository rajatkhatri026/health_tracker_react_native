import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
} from 'react-native';
import { COUNTRY_CODES, type CountryCode } from '../../utils/countryCodes';
import { styles } from './CountryPicker.styles';

interface Props {
  selected: CountryCode;
  onSelect: (country: CountryCode) => void;
}

const CountryPicker: React.FC<Props> = ({ selected, onSelect }) => {
  const [visible, setVisible] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = COUNTRY_CODES.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.includes(search)
  );

  const handleSelect = (country: CountryCode) => {
    onSelect(country);
    setVisible(false);
    setSearch('');
  };

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={() => setVisible(true)} activeOpacity={0.7}>
        <Text style={styles.flag}>{selected.flag}</Text>
        <Text style={styles.code}>{selected.code}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.title}>Select Country</Text>
                <TextInput
                  style={styles.search}
                  placeholder="Search country or code..."
                  placeholderTextColor="#ADB5BD"
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.name}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                      <Text style={styles.itemFlag}>{item.flag}</Text>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemCode}>{item.code}</Text>
                    </TouchableOpacity>
                  )}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
};

export default CountryPicker;
