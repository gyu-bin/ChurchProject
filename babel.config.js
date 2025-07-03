module.exports = {
    presets: ['babel-preset-expo'],
    plugins: [
        'babel-plugin-styled-components',
        'react-native-reanimated/plugin', // 👈 반드시 마지막에 추가
    ],
};
