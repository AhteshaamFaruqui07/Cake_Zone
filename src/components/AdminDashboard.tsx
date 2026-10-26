import React, { useState, useMemo, useEffect } from 'react';
import { Order, LowStockItem, OrderStatus, ScreenType } from '../types';
import { INITIAL_ORDERS, INITIAL_LOW_STOCK } from '../data/initialData';
import { supabase } from '../supabaseClient';
import {
  fetchOrders,
  updateOrderStatusInDb,
  fetchInventoryItems,
  updateInventoryItemInDb,
} from '../services/supabaseData';

interface AdminDashboardProps {
  onNavigate: (screen: ScreenType) => void;
  onOpenNewCustomOrder: () => void;
  onLogout?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  onOpenNewCustomOrder,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'Dashboard' | 'Orders' | 'Products' | 'Customers' | 'Analytics' | 'Settings'>('Dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All Statuses');
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [stockItems, setStockItems] = useState<LowStockItem[]>(INITIAL_LOW_STOCK);
  const [chartPeriod, setChartPeriod] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([
    'Batch #409: French Vanilla sponge completed baking at 175°C.',
    'VIP client Eleanor Vance requested delivery status on #CZ-8492.',
    'Inventory reminder: Order Valrhona Guanaja 70% chocolate bars.',
  ]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDateFilter, setActiveDateFilter] = useState<'Today' | 'This Week' | 'This Month'>('Today');

  // Protect private pages with supabase.auth.getSession() and load Supabase data
  useEffect(() => {
    const verifySessionAndLoadData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.history.replaceState(null, '', '/login');
        onNavigate('signin');
        return;
      }

      const { data: dbOrders } = await fetchOrders();
      if (dbOrders && dbOrders.length > 0) {
        setOrders(dbOrders);
      }

      const { data: dbInventory } = await fetchInventoryItems();
      if (dbInventory && dbInventory.length > 0) {
        setStockItems(dbInventory);
      }
    };
    verifySessionAndLoadData();
  }, [onNavigate]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'All Statuses' || order.status.toLowerCase() === statusFilter.toLowerCase();
      const matchesSearch =
        order.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.cakeItem.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const handleRestock = async (id: string) => {
    let targetRestocked = false;
    let targetRemaining = '';

    setStockItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          targetRestocked = !item.isRestocked;
          targetRemaining = targetRestocked ? 'Restocked (Healthy stock)' : item.remaining;
          return {
            ...item,
            isRestocked: targetRestocked,
            remaining: targetRemaining,
          };
        }
        return item;
      })
    );

    await updateInventoryItemInDb(id, {
      isRestocked: targetRestocked,
      remaining: targetRemaining,
    });
  };

  const handleCycleStatus = async (orderId: string) => {
    let updatedStatus: OrderStatus = 'Pending';

    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          if (ord.status === 'Pending') updatedStatus = 'Baking';
          else if (ord.status === 'Baking') updatedStatus = 'Delivered';
          else updatedStatus = 'Pending';
          return { ...ord, status: updatedStatus };
        }
        return ord;
      })
    );

    await updateOrderStatusInDb(orderId, updatedStatus);
  };

  return (
    <div className="bg-background text-on-background font-body min-h-screen flex flex-col">
      {/* TopNavBar (Shell) matching Image_7 and Image_8 */}
      <header className="bg-surface sticky top-0 z-40 w-full shadow-xs border-b border-outline-variant/30">
        <div className="flex justify-between items-center px-6 py-4 max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-6">
            <button
              onClick={() => onNavigate('storefront')}
              className="text-xl font-black text-primary tracking-tight font-headline cursor-pointer hover:opacity-80 transition-opacity"
            >
              CakeZone
            </button>
            <div className="hidden md:flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full w-72 border border-outline-variant/30">
              <span className="material-symbols-outlined text-outline text-sm">search</span>
              <input
                className="bg-transparent border-none text-sm focus:outline-none w-full text-on-surface placeholder:text-outline"
                placeholder="Search orders, cakes, customers..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-outline hover:text-on-surface text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors cursor-pointer"
                title="Notifications"
              >
                <span className="material-symbols-outlined">notifications</span>
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 p-4 z-50 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                    <h4 className="text-sm font-bold text-on-surface">Kitchen Alerts</h4>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-xs text-primary hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-on-surface-variant py-2">No active notifications</p>
                  ) : (
                    notifications.map((msg, idx) => (
                      <div key={idx} className="text-xs text-on-surface p-2 rounded-lg bg-surface-container flex gap-2 items-start">
                        <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
                        <span>{msg}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Profile Avatar CZ & Sign Out */}
            <div className="flex items-center gap-3 pl-2 border-l border-outline-variant">
              <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm shadow-xs">
                CZ
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-bold text-on-surface leading-tight">Master Baker</p>
                <p className="text-xs text-on-surface-variant">Admin</p>
              </div>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="ml-2 px-2.5 py-1 rounded-lg border border-outline-variant text-xs font-bold text-on-surface-variant hover:text-error hover:border-error/40 hover:bg-surface-container transition-all flex items-center gap-1 cursor-pointer"
                  title="Sign out of CakeZone"
                >
                  <span className="material-symbols-outlined text-sm">logout</span>
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Application Container */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar Navigation */}
        <aside className="w-64 hidden md:flex flex-col py-6 px-4 gap-2 bg-surface-container-low border-r border-outline-variant/30">
          <nav className="flex flex-col gap-1 w-full">
            <button
              onClick={() => setActiveTab('Dashboard')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm shadow-xs transition-all cursor-pointer ${
                activeTab === 'Dashboard'
                  ? 'bg-primary-container text-on-primary-container'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: activeTab === 'Dashboard' ? "'FILL' 1" : "'FILL' 0" }}
              >
                dashboard
              </span>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveTab('Orders')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Orders'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined">orders</span>
              <span>Orders</span>
            </button>
            <button
              onClick={() => setActiveTab('Products')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Products'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined">cake</span>
              <span>Products</span>
            </button>
            <button
              onClick={() => setActiveTab('Customers')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Customers'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined">group</span>
              <span>Customers</span>
            </button>
            <button
              onClick={() => setActiveTab('Analytics')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Analytics'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined">analytics</span>
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('Settings')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'Settings'
                  ? 'bg-primary-container text-on-primary-container font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined">settings</span>
              <span>Settings</span>
            </button>
          </nav>

          {/* Artisanal Batch Card at bottom of sidebar */}
          <div className="mt-auto p-4 rounded-2xl bg-secondary-container/50 border border-secondary-container flex flex-col gap-3">
            <div className="flex items-center gap-2 text-on-secondary-container font-bold text-sm">
              <span className="material-symbols-outlined text-primary">bakery_dining</span>
              <span>Artisanal Batch #409</span>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              All ovens operating at optimal temperature. Special vanilla bean shipment arrived.
            </p>
            <div className="flex items-center justify-between text-[11px] font-semibold text-primary pt-1">
              <span>Deck 1: 175°C</span>
              <span>Deck 2: 180°C</span>
            </div>
          </div>
        </aside>

        {/* Content Canvas */}
        <main className="flex-1 p-6 md:p-8 flex flex-col gap-8 overflow-y-auto">
          {/* Welcome Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-on-background tracking-tight font-headline">
                Dashboard Overview
              </h1>
              <p className="text-on-surface-variant text-sm">
                Welcome back! Here is what's baking at CakeZone today.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => {
                    setActiveDateFilter((prev) =>
                      prev === 'Today' ? 'This Week' : prev === 'This Week' ? 'This Month' : 'Today'
                    );
                  }}
                  className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold border border-outline-variant/40 transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  <span>{activeDateFilter}</span>
                </button>
              </div>
              <button
                onClick={onOpenNewCustomOrder}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-semibold shadow-xs hover:opacity-95 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>New Custom Cake</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Summary Cards (Bento Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Total Revenue
                </span>
                <div className="p-2 rounded-xl bg-primary-container/10 text-primary">
                  <span className="material-symbols-outlined">payments</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-on-surface tabular-nums">
                  $24,845.50
                </h3>
                <span className="text-xs font-bold text-emerald-600 flex items-center">
                  +12.4%
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">Compared to last month</p>
            </div>

            {/* Total Orders */}
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Total Orders
                </span>
                <div className="p-2 rounded-xl bg-secondary-container text-on-secondary-container">
                  <span className="material-symbols-outlined">receipt_long</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-on-surface tabular-nums">1,428</h3>
                <span className="text-xs font-bold text-emerald-600 flex items-center">
                  +8.2%
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">Active fulfilment pipeline</p>
            </div>

            {/* Active Custom Orders */}
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Active Custom Orders
                </span>
                <div className="p-2 rounded-xl bg-tertiary-container/25 text-tertiary">
                  <span className="material-symbols-outlined">cake</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-on-surface tabular-nums">38</h3>
                <span className="text-xs font-bold text-primary flex items-center">
                  Baking now
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">Weddings &amp; Birthdays</p>
            </div>

            {/* Customer Satisfaction */}
            <div className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/30 flex flex-col gap-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                  Customer Satisfaction
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  <span className="material-symbols-outlined">sentiment_satisfied</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-2xl font-black text-on-surface tabular-nums">4.9/5.0</h3>
                <span className="text-xs font-bold text-emerald-600">+0.1 pts</span>
              </div>
              <p className="text-xs text-on-surface-variant">Based on 640 reviews</p>
            </div>
          </div>

          {/* Analytics & Low Stock Alert Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Sales Analytics Chart Overview */}
            <div className="lg:col-span-2 bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 flex flex-col gap-4 shadow-xs">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">Sales Analytics</h2>
                  <p className="text-xs text-on-surface-variant">
                    {chartPeriod === 'Weekly'
                      ? 'Daily revenue breakdown for current week'
                      : 'Monthly revenue overview for past 4 weeks'}
                  </p>
                </div>
                <div className="flex gap-1 bg-surface-container p-1 rounded-xl">
                  <button
                    onClick={() => setChartPeriod('Weekly')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      chartPeriod === 'Weekly'
                        ? 'bg-surface text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => setChartPeriod('Monthly')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      chartPeriod === 'Monthly'
                        ? 'bg-surface text-primary shadow-xs'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Chart Graphic matching HTML */}
              <div className="h-64 w-full flex items-end justify-between gap-3 pt-6 px-4 border-b border-outline-variant/30 pb-2">
                {chartPeriod === 'Weekly' ? (
                  <>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $1,840
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[40%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Mon</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $2,950
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[65%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Tue</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $2,310
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[50%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Wed</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $3,680
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[80%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Thu</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                        $4,420
                      </div>
                      <div className="w-full bg-primary-container rounded-t-lg h-[95%] transition-all shadow-xs"></div>
                      <span className="text-xs text-on-surface font-bold">Fri</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $4,850
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[100%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Sat</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $3,190
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[70%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Sun</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $18,400
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[60%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Wk 1</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $21,200
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[75%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Wk 2</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $24,845
                      </div>
                      <div className="w-full bg-primary-container rounded-t-lg h-[92%] transition-all shadow-xs"></div>
                      <span className="text-xs text-on-surface font-bold">Wk 3</span>
                    </div>
                    <div className="w-full flex flex-col items-center gap-2 h-full justify-end group cursor-pointer">
                      <div className="text-[10px] text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity">
                        $22,600
                      </div>
                      <div className="w-full bg-primary-container/30 group-hover:bg-primary-container rounded-t-lg h-[80%] transition-all"></div>
                      <span className="text-xs text-on-surface-variant font-medium">Wk 4</span>
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-between items-center text-xs text-on-surface-variant px-2">
                <span>Peak Day: Saturday ($4,850)</span>
                <button
                  onClick={() => alert('Sales Report: Gross sales +12.4% vs last period. Top volume cake: Velvet Berry Bliss ($68).')}
                  className="font-bold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                >
                  View Full Report <span className="material-symbols-outlined text-xs">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Low Stock Alert Section */}
            <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 flex flex-col gap-4 shadow-xs">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-on-surface">Low Stock Alerts</h2>
                <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-xs font-bold">
                  {stockItems.filter((i) => !i.isRestocked).length} items
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Popular artisanal ingredients and cakes running low.
              </p>

              <div className="flex flex-col gap-3 mt-1">
                {stockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface border border-outline-variant/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary font-bold">
                        <span className="material-symbols-outlined text-sm">{item.icon}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-on-surface leading-tight">
                          {item.name}
                        </h4>
                        <p
                          className={`text-xs font-medium ${
                            item.isRestocked ? 'text-emerald-600' : 'text-error'
                          }`}
                        >
                          {item.remaining}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestock(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        item.isRestocked
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-primary-container text-on-primary-container hover:opacity-90'
                      }`}
                    >
                      {item.isRestocked ? 'Restocked ✓' : 'Restock'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-surface-container-low rounded-2xl p-6 border border-outline-variant/30 flex flex-col gap-4 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Recent Orders</h2>
                <p className="text-xs text-on-surface-variant">
                  Manage customer purchases and custom cake production status
                </p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-outline-variant/30 text-sm w-full sm:w-auto">
                  <span className="material-symbols-outlined text-outline text-sm">filter_list</span>
                  <select
                    className="bg-transparent border-none text-xs text-on-surface focus:outline-none pr-4 cursor-pointer"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="All Statuses">All Statuses</option>
                    <option value="Pending">Pending</option>
                    <option value="Baking">Baking</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Cake Item</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 text-sm">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-sm text-on-surface-variant">
                        No orders found matching "{searchQuery || statusFilter}".
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-surface/50 transition-colors group">
                        <td className="py-4 px-4 font-bold text-primary font-mono tabular-nums">
                          {ord.id}
                        </td>
                        <td className="py-4 px-4 font-medium text-on-surface">
                          {ord.customer}
                        </td>
                        <td className="py-4 px-4 text-on-surface-variant">
                          {ord.cakeItem}
                        </td>
                        <td className="py-4 px-4 text-on-surface-variant text-xs">
                          {ord.date}
                        </td>
                        <td className="py-4 px-4">
                          <button
                            onClick={() => handleCycleStatus(ord.id)}
                            title="Click to cycle status"
                            className="focus:outline-none cursor-pointer"
                          >
                            {ord.status === 'Pending' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 transition-colors">
                                Pending
                              </span>
                            )}
                            {ord.status === 'Baking' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary-container/15 text-primary hover:bg-primary-container/25 transition-colors">
                                Baking
                              </span>
                            )}
                            {ord.status === 'Delivered' && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 transition-colors">
                                Delivered
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-on-surface tabular-nums">
                          ${ord.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2">
              <p className="text-xs text-on-surface-variant">
                Showing {filteredOrders.length} of {orders.length} total active orders
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/30 text-xs font-semibold text-on-surface-variant hover:text-on-surface disabled:opacity-50 cursor-pointer"
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="px-3 py-1.5 rounded-lg bg-surface border border-outline-variant/30 text-xs font-semibold text-on-surface hover:bg-surface-container cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer (Shell) */}
      <footer className="bg-surface-container-low border-t border-outline-variant mt-auto">
        <div className="flex flex-col md:flex-row justify-between items-center px-6 py-8 max-w-7xl mx-auto w-full gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-primary font-headline">CakeZone</span>
            <p className="text-sm text-on-surface-variant">© 2023 CakeZone. All rights reserved.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-6 text-sm font-label">
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Back to Storefront
            </button>
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => onNavigate('storefront')}
              className="text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
            >
              FAQ
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
