import React from 'react';
import { 
  Users, MessageSquare, Database, Brain, 
  Activity, Settings, LogOut 
} from 'lucide-react';

const Dashboard = () => {
  const stats = [
    { title: 'Total Usuarios', value: '1,234', icon: Users, color: 'text-blue-500' },
    { title: 'Mensajes Hoy', value: '156', icon: MessageSquare, color: 'text-green-500' },
    { title: 'Consultas IA', value: '89', icon: Brain, color: 'text-purple-500' },
    { title: 'Tasa de Respuesta', value: '98%', icon: Activity, color: 'text-yellow-500' },
  ];

  const menuItems = [
    { name: 'Base de Datos', icon: Database, path: '/database' },
    { name: 'Configuración IA', icon: Brain, path: '/ai-config' },
    { name: 'Ajustes', icon: Settings, path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Barra superior */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <span className="text-xl font-bold">TecnoBot Admin</span>
            <button className="flex items-center text-red-600 hover:text-red-800">
              <LogOut className="w-5 h-5 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">{stat.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          ))}
        </div>

        {/* Menú de accesos rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {menuItems.map((item, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex items-center">
                <item.icon className="h-8 w-8 mr-4 text-gray-500" />
                <span className="text-lg font-medium">{item.name}</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;