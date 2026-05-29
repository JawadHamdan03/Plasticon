import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { EngineerTabParamList } from './types';
import { PlaceholderScreen } from '../screens/shared/PlaceholderScreen';

const Dashboard   = () => <PlaceholderScreen title="Dashboard"   icon="speedometer-outline"         />;
const Maintenance = () => <PlaceholderScreen title="Maintenance" icon="construct-outline"            />;
const Machines    = () => <PlaceholderScreen title="Machines"    icon="hardware-chip-outline"        />;
const Assistant   = () => <PlaceholderScreen title="AI Assistant" icon="chatbubble-ellipses-outline" />;
const Profile     = () => <PlaceholderScreen title="Profile"     icon="person-outline"               />;

const Tab = createBottomTabNavigator<EngineerTabParamList>();

export function EngineerTabs() {
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
            Dashboard:   ['speedometer',           'speedometer-outline'],
            Maintenance: ['construct',             'construct-outline'],
            Machines:    ['hardware-chip',         'hardware-chip-outline'],
            Assistant:   ['chatbubble-ellipses',   'chatbubble-ellipses-outline'],
            Profile:     ['person',                'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"   component={Dashboard}   options={{ tabBarLabel: 'Dashboard' }}   />
      <Tab.Screen name="Maintenance" component={Maintenance} options={{ tabBarLabel: 'Maintenance' }} />
      <Tab.Screen name="Machines"    component={Machines}    options={{ tabBarLabel: 'Machines' }}    />
      <Tab.Screen name="Assistant"   component={Assistant}   options={{ tabBarLabel: 'AI Chat' }}     />
      <Tab.Screen name="Profile"     component={Profile}     options={{ tabBarLabel: 'Profile' }}     />
    </Tab.Navigator>
  );
}
