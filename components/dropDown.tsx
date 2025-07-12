import { useDesign } from '@/context/DesignSystem';
import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import styled from 'styled-components/native';

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
  dropdownPosition?: 'auto' | 'top' | 'bottom';
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
  dropdownPosition = 'auto', // ✅ 추가
}) => {
  const { colors } = useDesign();
  return (
    <Dropdown
      style={{
        height: 48,
        borderRadius: 12,
        paddingHorizontal: 16,
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
        color: colors.text,
      }}
      itemContainerStyle={{
        backgroundColor: colors.card,
      }}
      containerStyle={{
        borderRadius: 24,
        borderWidth: 0,
        backgroundColor: colors.card,
      }}
      data={data}
      maxHeight={maxHeight}
      dropdownPosition={dropdownPosition}
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
