import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';

type DropdownOption = {
  label: string;
  value: string;
};

interface CustomDropdownProps {
  data: DropdownOption[];
  value: string | null;
  onChange: (item: DropdownOption) => void; // 🔥 전체 객체로 변경
  placeholder?: string;
  containerStyle?: ViewStyle;
  dropdownStyle?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  maxHeight?: number;
}
const CustomDropdown: React.FC<CustomDropdownProps> = ({
  data,
  value,
  onChange,
  placeholder = '선택',
  containerStyle = {},
  dropdownStyle = {},
  textStyle = {},
  disabled = false,
  maxHeight = 200,
}) => {
  return (
    <Dropdown
      style={{
        height: 48,
        borderColor: '#FFA726',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        ...containerStyle,
      }}
      placeholderStyle={{
        fontSize: 15,
        color: '#999',
      }}
      selectedTextStyle={{
        fontSize: 15,
        color: '#333',
        ...textStyle,
      }}
      itemTextStyle={{
        fontSize: 14,
        paddingVertical: 10,
      }}
      data={data}
      maxHeight={maxHeight}
      labelField='label'
      valueField='value'
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disable={disabled}
    />
  );
};

export default CustomDropdown;
