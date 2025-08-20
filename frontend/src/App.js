import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import shadcn components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Calendar } from './components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import { Textarea } from './components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './components/ui/alert-dialog';

// Import icons
import { CalendarIcon, PlusCircle, TrendingUp, DollarSign, CreditCard, Target, LogOut, Eye, EyeOff, Edit, Trash2, Filter, Search, ArrowUpDown, ChevronLeft, ChevronRight, AlertTriangle, TrendingDown } from 'lucide-react';

// Date utilities
import { format } from 'date-fns';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Authentication Context
const AuthContext = React.createContext();

// Main App Component
function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  
  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, [token]);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={user ? <Navigate to="/" /> : <AuthPage />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
            <Route path="/expenses" element={user ? <ExpensesPage /> : <Navigate to="/auth" />} />
            <Route path="/budgets" element={user ? <BudgetsPage /> : <Navigate to="/auth" />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthContext.Provider>
  );
}

// Authentication Page Component
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { email: formData.email, password: formData.password, name: formData.name };

      const response = await axios.post(`${API}${endpoint}`, payload);
      login(response.data.access_token, response.data.user);
    } catch (error) {
      alert(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            ExpenseBuddy
          </CardTitle>
          <CardDescription className="text-slate-600">
            {isLogin ? 'Welcome back! Please sign in.' : 'Create your account to get started.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Full Name</label>
                <Input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  className="h-11 pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-11 px-3 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium shadow-lg"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-emerald-600 hover:text-emerald-800 font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Navigation Component
const Navigation = ({ currentPage }) => {
  const { user, logout } = React.useContext(AuthContext);
  const navigate = React.useCallback((path) => {
    window.location.href = `/${path === 'dashboard' ? '' : path}`;
  }, []);

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800">ExpenseBuddy</span>
            </div>
            <div className="hidden md:flex space-x-1">
              <Button
                variant={currentPage === 'dashboard' ? 'default' : 'ghost'}
                onClick={() => navigate('dashboard')}
                className="font-medium"
              >
                Dashboard
              </Button>
              <Button
                variant={currentPage === 'expenses' ? 'default' : 'ghost'}
                onClick={() => navigate('expenses')}
                className="font-medium"
              >
                Expenses
              </Button>
              <Button
                variant={currentPage === 'budgets' ? 'default' : 'ghost'}
                onClick={() => navigate('budgets')}
                className="font-medium"
              >
                Budgets
              </Button>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-600">Welcome, {user?.name}</span>
            <Button variant="outline" onClick={logout} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Dashboard Component
const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = React.useContext(AuthContext);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation currentPage="dashboard" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage="dashboard" />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
          <AddExpenseDialog onExpenseAdded={fetchDashboardData} />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-sm font-medium">Total Expenses</p>
                  <p className="text-3xl font-bold">${dashboardData?.total_expenses?.toFixed(2) || '0.00'}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">This Month</p>
                  <p className="text-3xl font-bold">${dashboardData?.monthly_expenses?.toFixed(2) || '0.00'}</p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-pink-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Budget Status</p>
                  <p className="text-3xl font-bold">{dashboardData?.budget_status?.length || 0}</p>
                </div>
                <Target className="w-8 h-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Categories Breakdown */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-slate-800">Monthly Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.categories_breakdown?.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-slate-700 font-medium">{category.name}</span>
                    <Badge variant="secondary" className="text-slate-700">
                      ${category.amount.toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Budget Progress */}
          <Card className="shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-slate-800">Budget Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboardData?.budget_status?.map((budget, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 font-medium">{budget.category_name}</span>
                      <span className="text-sm text-slate-600">
                        ${budget.spent_amount.toFixed(2)} / ${budget.monthly_limit.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={budget.percentage} 
                      className={`h-2 ${budget.percentage > 100 ? 'bg-red-100' : 'bg-slate-100'}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Expenses */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="text-slate-800">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.recent_expenses?.map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-800">{expense.description}</p>
                    <p className="text-sm text-slate-600">{expense.category_name} • {format(new Date(expense.date), 'MMM dd, yyyy')}</p>
                  </div>
                  <Badge variant="outline" className="font-semibold">
                    ${expense.amount.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Enhanced Expenses Page Component
const ExpensesPage = () => {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category_id: '',
    start_date: '',
    end_date: '',
    min_amount: '',
    max_amount: '',
    search: '',
    sort_by: 'date',
    sort_order: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total_count: 0,
    total_pages: 0
  });
  const { token } = React.useContext(AuthContext);

  useEffect(() => {
    fetchCategories();
    fetchExpenses();
  }, [filters, pagination.page]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      });

      const response = await axios.get(`${API}/expenses?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setExpenses(response.data.expenses);
      setPagination(prev => ({
        ...prev,
        total_count: response.data.total_count,
        total_pages: response.data.total_pages
      }));
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({
      category_id: '',
      start_date: '',
      end_date: '',
      min_amount: '',
      max_amount: '',
      search: '',
      sort_by: 'date',
      sort_order: 'desc'
    });
  };

  const handleExpenseUpdate = () => {
    fetchExpenses();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage="expenses" />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-800">Expenses</h1>
          <AddExpenseDialog onExpenseAdded={handleExpenseUpdate} />
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search descriptions..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-sm font-medium">Category</label>
                <Select value={filters.category_id} onValueChange={(value) => handleFilterChange('category_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => handleFilterChange('start_date', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => handleFilterChange('end_date', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Min Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={filters.min_amount}
                  onChange={(e) => handleFilterChange('min_amount', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Max Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1000.00"
                  value={filters.max_amount}
                  onChange={(e) => handleFilterChange('max_amount', e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Sort By</label>
                <Select value={filters.sort_by} onValueChange={(value) => handleFilterChange('sort_by', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="category_name">Category</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Order</label>
                <Select value={filters.sort_order} onValueChange={(value) => handleFilterChange('sort_order', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>
              Expenses ({pagination.total_count} total)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                <p>No expenses found matching your criteria.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense) => (
                  <ExpenseItem 
                    key={expense.id} 
                    expense={expense} 
                    categories={categories}
                    onUpdate={handleExpenseUpdate}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.total_pages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <p className="text-sm text-slate-600">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total_count)} of {pagination.total_count} results
                </p>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-slate-600">
                    Page {pagination.page} of {pagination.total_pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.total_pages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Expense Item Component
const ExpenseItem = ({ expense, categories, onUpdate }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { token } = React.useContext(AuthContext);

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/expenses/${expense.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdate();
      setDeleteDialogOpen(false);
    } catch (error) {
      alert('Error deleting expense: ' + (error.response?.data?.detail || error.message));
    }
  };

  const categoryColor = categories.find(c => c.id === expense.category_id)?.color || '#A5A5A5';

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-center space-x-4">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: categoryColor }}
        >
          {categories.find(c => c.id === expense.category_id)?.icon || '📝'}
        </div>
        <div>
          <p className="font-semibold text-slate-800">{expense.description}</p>
          <p className="text-sm text-slate-600">
            {expense.category_name} • {format(new Date(expense.date), 'MMM dd, yyyy')}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <span className="text-xl font-bold text-slate-800">
          ${expense.amount.toFixed(2)}
        </span>
        <div className="flex space-x-1">
          <EditExpenseDialog 
            expense={expense} 
            categories={categories} 
            onUpdate={onUpdate}
            trigger={
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4" />
              </Button>
            }
          />
          
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{expense.description}"? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

// Enhanced Budgets Page Component
const BudgetsPage = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [alerts, setAlerts] = useState({ budget_alerts: [], spending_insights: [] });
  const [loading, setLoading] = useState(true);
  const { token } = React.useContext(AuthContext);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budgetsRes, categoriesRes, alertsRes] = await Promise.all([
        axios.get(`${API}/budgets`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/categories`),
        axios.get(`${API}/alerts`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      
      setBudgets(budgetsRes.data);
      setCategories(categoriesRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation currentPage="budgets" />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading budgets...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation currentPage="budgets" />
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-800">Budgets</h1>
          <AddBudgetDialog categories={categories} onBudgetAdded={fetchData} />
        </div>

        {/* Alerts */}
        {alerts.budget_alerts.length > 0 && (
          <Card className="shadow-lg border-0 border-l-4 border-l-orange-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="w-5 h-5" />
                Budget Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.budget_alerts.map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg ${alert.type === 'danger' ? 'bg-red-50 text-red-800' : 'bg-orange-50 text-orange-800'}`}>
                    <p className="font-medium">{alert.category}</p>
                    <p className="text-sm">{alert.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spending Insights */}
        {alerts.spending_insights.length > 0 && (
          <Card className="shadow-lg border-0 border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <TrendingDown className="w-5 h-5" />
                Spending Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.spending_insights.map((insight, index) => (
                  <div key={index} className="p-3 bg-blue-50 text-blue-800 rounded-lg">
                    <p>{insight.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.map((budget) => (
            <BudgetCard 
              key={budget.id} 
              budget={budget} 
              categories={categories}
              onUpdate={fetchData} 
            />
          ))}
        </div>

        {budgets.length === 0 && (
          <Card className="shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No budgets yet</h3>
              <p className="text-slate-600 mb-4">Create your first budget to start tracking your spending goals.</p>
              <AddBudgetDialog categories={categories} onBudgetAdded={fetchData} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

// Budget Card Component
const BudgetCard = ({ budget, categories, onUpdate }) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { token } = React.useContext(AuthContext);

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/budgets/${budget.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdate();
      setDeleteDialogOpen(false);
    } catch (error) {
      alert('Error deleting budget: ' + (error.response?.data?.detail || error.message));
    }
  };

  const category = categories.find(c => c.id === budget.category_id);
  const percentage = (budget.spent_amount / budget.monthly_limit) * 100;
  const isOverBudget = percentage > 100;

  return (
    <Card className={`shadow-lg border-0 ${isOverBudget ? 'border-l-4 border-l-red-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white"
              style={{ backgroundColor: category?.color || '#A5A5A5' }}
            >
              {category?.icon || '📝'}
            </div>
            <div>
              <CardTitle className="text-lg">{budget.category_name}</CardTitle>
            </div>
          </div>
          <div className="flex space-x-1">
            <EditBudgetDialog 
              budget={budget} 
              onUpdate={onUpdate}
              trigger={
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
              }
            />
            
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Budget</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete the budget for {budget.category_name}? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Spent</span>
            <span className="font-semibold">${budget.spent_amount.toFixed(2)}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Budget</span>
            <span className="font-semibold">${budget.monthly_limit.toFixed(2)}</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Progress</span>
              <span className={`text-sm font-medium ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                {percentage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(percentage, 100)} 
              className={`h-3 ${isOverBudget ? 'bg-red-100' : 'bg-slate-100'}`}
            />
            {isOverBudget && (
              <p className="text-xs text-red-600 font-medium">
                Over budget by ${(budget.spent_amount - budget.monthly_limit).toFixed(2)}
              </p>
            )}
          </div>
          
          <div className="text-xs text-slate-500">
            Remaining: ${Math.max(0, budget.monthly_limit - budget.spent_amount).toFixed(2)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Add Expense Dialog Component
const AddExpenseDialog = ({ onExpenseAdded }) => {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    amount: '',
    category_id: '',
    description: '',
    date: new Date()
  });
  const [loading, setLoading] = useState(false);
  const { token } = React.useContext(AuthContext);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/expenses`, {
        amount: parseFloat(formData.amount),
        category_id: formData.category_id,
        description: formData.description,
        date: formData.date.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOpen(false);
      setFormData({ amount: '', category_id: '', description: '', date: new Date() });
      onExpenseAdded();
    } catch (error) {
      alert('Error adding expense: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>Enter the details of your expense.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="What did you spend on?"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({...formData, date: date || new Date()})}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
              {loading ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit Expense Dialog Component
const EditExpenseDialog = ({ expense, categories, onUpdate, trigger }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    amount: expense.amount.toString(),
    category_id: expense.category_id,
    description: expense.description,
    date: new Date(expense.date)
  });
  const [loading, setLoading] = useState(false);
  const { token } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/expenses/${expense.id}`, {
        amount: parseFloat(formData.amount),
        category_id: formData.category_id,
        description: formData.description,
        date: formData.date.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOpen(false);
      onUpdate();
    } catch (error) {
      alert('Error updating expense: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
          <DialogDescription>Update the expense details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(formData.date, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.date}
                  onSelect={(date) => setFormData({...formData, date: date || new Date()})}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
              {loading ? 'Updating...' : 'Update Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Add Budget Dialog Component
const AddBudgetDialog = ({ categories, onBudgetAdded }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    monthly_limit: ''
  });
  const [loading, setLoading] = useState(false);
  const { token } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/budgets`, {
        category_id: formData.category_id,
        monthly_limit: parseFloat(formData.monthly_limit)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOpen(false);
      setFormData({ category_id: '', monthly_limit: '' });
      onBudgetAdded();
    } catch (error) {
      alert('Error creating budget: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700">
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Budget
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Budget</DialogTitle>
          <DialogDescription>Set a monthly spending limit for a category.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <Select value={formData.category_id} onValueChange={(value) => setFormData({...formData, category_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Monthly Limit</label>
            <Input
              type="number"
              step="0.01"
              placeholder="500.00"
              value={formData.monthly_limit}
              onChange={(e) => setFormData({...formData, monthly_limit: e.target.value})}
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
              {loading ? 'Creating...' : 'Create Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit Budget Dialog Component
const EditBudgetDialog = ({ budget, onUpdate, trigger }) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    monthly_limit: budget.monthly_limit.toString()
  });
  const [loading, setLoading] = useState(false);
  const { token } = React.useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/budgets/${budget.id}`, {
        monthly_limit: parseFloat(formData.monthly_limit)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setOpen(false);
      onUpdate();
    } catch (error) {
      alert('Error updating budget: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Budget</DialogTitle>
          <DialogDescription>Update the monthly limit for {budget.category_name}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Monthly Limit</label>
            <Input
              type="number"
              step="0.01"
              value={formData.monthly_limit}
              onChange={(e) => setFormData({...formData, monthly_limit: e.target.value})}
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600">
              {loading ? 'Updating...' : 'Update Budget'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default App;