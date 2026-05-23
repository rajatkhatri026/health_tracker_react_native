import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  TextInput,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import { COUNTRY_CODES, type CountryCode } from '../../utils/countryCodes';
import { styles } from './CountryPicker.styles';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Fixed list height: screen height minus sheet chrome (handle+title+search+padding) and keyboard room
const LIST_HEIGHT = SCREEN_HEIGHT * 0.45;

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

  const handleClose = () => {
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
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        <TouchableWithoutFeedback onPress={handleClose}>
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
                  returnKeyType="search"
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
                  style={{ height: LIST_HEIGHT }}
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
