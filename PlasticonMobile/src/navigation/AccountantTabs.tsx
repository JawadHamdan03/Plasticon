import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { AccountantTabParamList } from './types';
import { PlaceholderScreen } from '../screens/shared/PlaceholderScreen';

const Finance  = () => <PlaceholderScreen title="Finance Dashboard" icon="wallet-outline"           />;
const Invoices = () => <PlaceholderScreen title="Invoices"          icon="document-text-outline"    />;
const Expenses = () => <PlaceholderScreen title="Expenses"          icon="receipt-outline"          />;
const More     = () => <PlaceholderScreen title="More"              icon="grid-outline"             />;
const Profile  = () => <PlaceholderScreen title="Profile"           icon="person-outline"           />;

const Tab = createBottomTabNavigator<AccountantTabParamList>();

export function AccountantTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopWidth: 0,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor:   colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, [string, string]> = {
            Finance:  ['wallet',        'wallet-outline'],
            Invoices: ['document-text', 'document-text-outline'],
            Expenses: ['receipt',       'receipt-outline'],
            More:     ['grid',          'grid-outline'],
            Profile:  ['person',        'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Finance"  component={Finance}  options={{ tabBarLabel: 'Finance' }}  />
      <Tab.Screen name="Invoices" component={Invoices} options={{ tabBarLabel: 'Invoices' }} />
      <Tab.Screen name="Expenses" component={Expenses} options={{ tabBarLabel: 'Expenses' }} />
      <Tab.Screen name="More"     component={More}     options={{ tabBarLabel: 'More' }}     />
      <Tab.Screen name="Profile"  component={Profile}  options={{ tabBarLabel: 'Profile' }}  />
    </Tab.Navigator>
  );
}
