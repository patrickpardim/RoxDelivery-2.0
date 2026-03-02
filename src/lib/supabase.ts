import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!supabaseUrl && !!supabaseAnonKey && supabaseUrl !== 'undefined';

// --- MOCK CLIENT IMPLEMENTATION ---

class MockSupabaseClient {
  auth = {
    getSession: async () => {
      const session = localStorage.getItem('olaclick-mock-session');
      return { data: { session: session ? JSON.parse(session) : null }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithPassword: async ({ email }: any) => {
      const user = { id: 'mock-user-id', email };
      const session = { user, access_token: 'mock-token' };
      localStorage.setItem('olaclick-mock-session', JSON.stringify(session));
      
      // Ensure profile exists
      const profiles = JSON.parse(localStorage.getItem('olaclick-mock-profiles') || '[]');
      if (!profiles.find((p: any) => p.id === user.id)) {
        profiles.push({
          id: user.id,
          store_name: 'Minha Loja Demo',
          store_slug: 'demo-store',
          whatsapp_number: '5511999999999'
        });
        localStorage.setItem('olaclick-mock-profiles', JSON.stringify(profiles));
      }
      
      return { data: { user, session }, error: null };
    },
    signUp: async ({ email }: any) => {
      const user = { id: 'mock-user-id', email };
      const session = { user, access_token: 'mock-token' };
      localStorage.setItem('olaclick-mock-session', JSON.stringify(session));
      return { data: { user, session }, error: null };
    },
    signOut: async () => {
      localStorage.removeItem('olaclick-mock-session');
      return { error: null };
    }
  };

  from(table: string) {
    return new MockQueryBuilder(table);
  }
}

class MockQueryBuilder {
  table: string;
  filters: any[] = [];
  _order: any = null;
  _operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  _data: any = null;
  _single: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns = '*', { count }: any = {}) {
    this._operation = 'select';
    return this;
  }

  insert(data: any) {
    this._operation = 'insert';
    this._data = data;
    return this;
  }

  update(data: any) {
    this._operation = 'update';
    this._data = data;
    return this;
  }

  delete() {
    this._operation = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  order(column: string, { ascending = true }: any = {}) {
    this._order = { column, ascending };
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  // Execute the query
  then(resolve: any, reject: any) {
    const key = `olaclick-mock-${this.table}`;
    let items = JSON.parse(localStorage.getItem(key) || '[]');
    let result: any = null;
    let error: any = null;

    try {
      if (this._operation === 'insert') {
        const newItem = { ...this._data, id: uuidv4(), created_at: new Date().toISOString() };
        items.push(newItem);
        localStorage.setItem(key, JSON.stringify(items));
        result = newItem;
      } 
      else if (this._operation === 'update') {
        // Apply filters to find items to update
        const indicesToUpdate: number[] = [];
        items.forEach((item: any, index: number) => {
          let match = true;
          for (const filter of this.filters) {
            if (filter.operator === 'eq' && item[filter.column] !== filter.value) match = false;
          }
          if (match) indicesToUpdate.push(index);
        });

        indicesToUpdate.forEach(index => {
          items[index] = { ...items[index], ...this._data };
        });
        localStorage.setItem(key, JSON.stringify(items));
        result = indicesToUpdate.map(i => items[i]);
      }
      else if (this._operation === 'delete') {
        const initialLength = items.length;
        items = items.filter((item: any) => {
          for (const filter of this.filters) {
            if (filter.operator === 'eq' && item[filter.column] === filter.value) return false;
          }
          return true;
        });
        localStorage.setItem(key, JSON.stringify(items));
        result = null;
      }
      else {
        // SELECT
        result = items.filter((item: any) => {
          for (const filter of this.filters) {
            if (filter.operator === 'eq' && item[filter.column] !== filter.value) return false;
          }
          return true;
        });

        if (this._order) {
          result.sort((a: any, b: any) => {
            if (a[this._order.column] < b[this._order.column]) return this._order.ascending ? -1 : 1;
            if (a[this._order.column] > b[this._order.column]) return this._order.ascending ? 1 : -1;
            return 0;
          });
        }

        if (this._single) {
          result = result[0] || null;
        }
      }

      resolve({ data: result, error, count: Array.isArray(result) ? result.length : 0 });
    } catch (e: any) {
      resolve({ data: null, error: { message: e.message } });
    }
  }
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : (new MockSupabaseClient() as unknown as SupabaseClient);
