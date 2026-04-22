const dotenv = require('dotenv');
const mongoose = require('mongoose');

const connectDB = require('../config/db');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');

dotenv.config();

const adminUserSeed = {
  name: 'Admin',
  email: 'admin@techshop.vn',
  password: 'admin123456',
  role: 'admin',
};

const productSeeds = [
  {
    name: 'ASUS ROG Strix G16 2025',
    sku: 'LAPTOP-ASUS-ROG-G16-2025',
    category: 'Laptop',
    subcategory: 'Gaming Laptop',
    brand: 'ASUS',
    images: ['https://via.placeholder.com/1200x800?text=ASUS+ROG+Strix+G16'],
    price: 46990000,
    salePrice: 43990000,
    countInStock: 12,
    specs: [
      { key: 'CPU', value: 'Intel Core i9-14900HX' },
      { key: 'GPU', value: 'NVIDIA GeForce RTX 4070 8GB' },
      { key: 'RAM', value: '32GB DDR5' },
    ],
    description:
      'High-performance gaming laptop with modern CPU/GPU and fast DDR5 memory for intensive workloads.',
    isFeatured: true,
  },
  {
    name: 'Lenovo ThinkPad E14 Gen 6',
    sku: 'LAPTOP-LENOVO-THINKPAD-E14-G6',
    category: 'Laptop',
    subcategory: 'Office Laptop',
    brand: 'Lenovo',
    images: ['https://via.placeholder.com/1200x800?text=Lenovo+ThinkPad+E14+Gen+6'],
    price: 22490000,
    salePrice: null,
    countInStock: 25,
    specs: [
      { key: 'CPU', value: 'Intel Core Ultra 7 155H' },
      { key: 'RAM', value: '16GB DDR5' },
      { key: 'Storage', value: '512GB NVMe SSD' },
    ],
    description:
      'Reliable business laptop focused on battery life, keyboard quality, and durable construction.',
    isFeatured: false,
  },
  {
    name: 'TechShop Gaming PC RTX 4060',
    sku: 'PC-TECHSHOP-GAMING-RTX4060',
    category: 'PC',
    subcategory: 'Gaming PC',
    brand: 'TechShop',
    images: ['https://via.placeholder.com/1200x800?text=TechShop+Gaming+PC+RTX+4060'],
    price: 28990000,
    salePrice: 27490000,
    countInStock: 8,
    specs: [
      { key: 'CPU', value: 'Intel Core i5-14600KF' },
      { key: 'GPU', value: 'GeForce RTX 4060 8GB' },
      { key: 'RAM', value: '32GB DDR5' },
    ],
    description:
      'Prebuilt gaming desktop tuned for 1080p and 1440p gameplay with solid thermals and cable routing.',
    isFeatured: true,
  },
  {
    name: 'Intel Core i5-14600KF',
    sku: 'CPU-INTEL-I5-14600KF',
    category: 'CPU',
    subcategory: '',
    brand: 'Intel',
    images: ['https://via.placeholder.com/1200x800?text=Intel+Core+i5-14600KF'],
    price: 8190000,
    salePrice: 7790000,
    countInStock: 45,
    specs: [
      { key: 'Cores/Threads', value: '14/20' },
      { key: 'Boost Clock', value: 'Up to 5.3GHz' },
      { key: 'Socket', value: 'LGA1700' },
    ],
    description:
      'Balanced performance processor for gaming and productivity with strong single-core throughput.',
    isFeatured: true,
  },
  {
    name: 'AMD Ryzen 7 7800X3D',
    sku: 'CPU-AMD-RYZEN7-7800X3D',
    category: 'CPU',
    subcategory: '',
    brand: 'AMD',
    images: ['https://via.placeholder.com/1200x800?text=AMD+Ryzen+7+7800X3D'],
    price: 10290000,
    salePrice: null,
    countInStock: 30,
    specs: [
      { key: 'Cores/Threads', value: '8/16' },
      { key: 'Cache', value: '96MB L3 3D V-Cache' },
      { key: 'Socket', value: 'AM5' },
    ],
    description:
      'Gaming-focused CPU with large cache design and excellent frame-time consistency.',
    isFeatured: false,
  },
  {
    name: 'MSI GeForce RTX 4070 Super Ventus 2X',
    sku: 'GPU-MSI-RTX4070SUPER-VENTUS2X',
    category: 'GPU',
    subcategory: '',
    brand: 'MSI',
    images: ['https://via.placeholder.com/1200x800?text=MSI+RTX+4070+Super+Ventus+2X'],
    price: 17990000,
    salePrice: 16990000,
    countInStock: 20,
    specs: [
      { key: 'VRAM', value: '12GB GDDR6X' },
      { key: 'Boost Clock', value: '2505MHz' },
      { key: 'Interface', value: 'PCIe 4.0 x16' },
    ],
    description:
      'Efficient Ada Lovelace GPU with DLSS support for high-performance gaming and content creation.',
    isFeatured: true,
  },
  {
    name: 'Sapphire Pulse Radeon RX 7800 XT',
    sku: 'GPU-SAPPHIRE-RX7800XT-PULSE',
    category: 'GPU',
    subcategory: '',
    brand: 'Sapphire',
    images: ['https://via.placeholder.com/1200x800?text=Sapphire+Pulse+RX+7800+XT'],
    price: 15990000,
    salePrice: null,
    countInStock: 16,
    specs: [
      { key: 'VRAM', value: '16GB GDDR6' },
      { key: 'Boost Clock', value: '2430MHz' },
      { key: 'Interface', value: 'PCIe 4.0 x16' },
    ],
    description:
      'Strong rasterization card optimized for 1440p gaming with generous video memory capacity.',
    isFeatured: false,
  },
  {
    name: 'Corsair Vengeance DDR5 32GB 6000MHz',
    sku: 'RAM-CORSAIR-VENGEANCE-DDR5-32-6000',
    category: 'RAM',
    subcategory: '',
    brand: 'Corsair',
    images: ['https://via.placeholder.com/1200x800?text=Corsair+Vengeance+DDR5+32GB'],
    price: 3590000,
    salePrice: 3290000,
    countInStock: 60,
    specs: [
      { key: 'Capacity', value: '32GB (2x16GB)' },
      { key: 'Speed', value: '6000MHz' },
      { key: 'Latency', value: 'CL36' },
    ],
    description:
      'High-speed dual-channel DDR5 kit suitable for modern gaming and workstation builds.',
    isFeatured: false,
  },
  {
    name: 'Kingston Fury Beast DDR4 16GB 3200MHz',
    sku: 'RAM-KINGSTON-FURY-DDR4-16-3200',
    category: 'RAM',
    subcategory: '',
    brand: 'Kingston',
    images: ['https://via.placeholder.com/1200x800?text=Kingston+Fury+Beast+DDR4+16GB'],
    price: 1190000,
    salePrice: null,
    countInStock: 90,
    specs: [
      { key: 'Capacity', value: '16GB (2x8GB)' },
      { key: 'Speed', value: '3200MHz' },
      { key: 'Latency', value: 'CL16' },
    ],
    description:
      'Cost-effective DDR4 memory kit delivering stable performance for mainstream systems.',
    isFeatured: false,
  },
  {
    name: 'Samsung 990 PRO 1TB NVMe PCIe 4.0',
    sku: 'SSD-SAMSUNG-990PRO-1TB',
    category: 'SSD',
    subcategory: '',
    brand: 'Samsung',
    images: ['https://via.placeholder.com/1200x800?text=Samsung+990+PRO+1TB'],
    price: 3290000,
    salePrice: 2990000,
    countInStock: 55,
    specs: [
      { key: 'Capacity', value: '1TB' },
      { key: 'Read Speed', value: 'Up to 7450MB/s' },
      { key: 'Write Speed', value: 'Up to 6900MB/s' },
    ],
    description:
      'Premium PCIe Gen4 NVMe SSD with excellent sustained performance and efficiency.',
    isFeatured: true,
  },
  {
    name: 'WD Blue SN580 1TB NVMe',
    sku: 'SSD-WD-SN580-1TB',
    category: 'SSD',
    subcategory: '',
    brand: 'Western Digital',
    images: ['https://via.placeholder.com/1200x800?text=WD+Blue+SN580+1TB'],
    price: 1790000,
    salePrice: null,
    countInStock: 70,
    specs: [
      { key: 'Capacity', value: '1TB' },
      { key: 'Read Speed', value: 'Up to 4150MB/s' },
      { key: 'Form Factor', value: 'M.2 2280' },
    ],
    description:
      'Reliable everyday NVMe storage for gaming libraries and productivity workloads.',
    isFeatured: false,
  },
  {
    name: 'Seagate BarraCuda 2TB 7200RPM',
    sku: 'HDD-SEAGATE-BARRACUDA-2TB-7200',
    category: 'HDD',
    subcategory: '',
    brand: 'Seagate',
    images: ['https://via.placeholder.com/1200x800?text=Seagate+BarraCuda+2TB'],
    price: 1490000,
    salePrice: null,
    countInStock: 85,
    specs: [
      { key: 'Capacity', value: '2TB' },
      { key: 'Speed', value: '7200RPM' },
      { key: 'Cache', value: '256MB' },
    ],
    description:
      'High-capacity hard drive for bulk storage, backups, and media libraries.',
    isFeatured: false,
  },
  {
    name: 'ASUS TUF Gaming B760-PLUS WIFI',
    sku: 'MAINBOARD-ASUS-TUF-B760PLUS-WIFI',
    category: 'Mainboard',
    subcategory: '',
    brand: 'ASUS',
    images: ['https://via.placeholder.com/1200x800?text=ASUS+TUF+B760-PLUS+WIFI'],
    price: 5490000,
    salePrice: 5190000,
    countInStock: 32,
    specs: [
      { key: 'Socket', value: 'LGA1700' },
      { key: 'Memory', value: 'DDR5' },
      { key: 'Form Factor', value: 'ATX' },
    ],
    description:
      'Durable Intel platform motherboard with robust VRM, Wi-Fi, and expansion options.',
    isFeatured: false,
  },
  {
    name: 'Corsair RM750e 750W 80 Plus Gold',
    sku: 'PSU-CORSAIR-RM750E-750W-GOLD',
    category: 'PSU',
    subcategory: '',
    brand: 'Corsair',
    images: ['https://via.placeholder.com/1200x800?text=Corsair+RM750e+750W'],
    price: 2890000,
    salePrice: null,
    countInStock: 40,
    specs: [
      { key: 'Power', value: '750W' },
      { key: 'Efficiency', value: '80 Plus Gold' },
      { key: 'Modularity', value: 'Fully Modular' },
    ],
    description:
      'Quiet and efficient power supply designed for stable output under heavy load.',
    isFeatured: false,
  },
  {
    name: 'NZXT H5 Flow Mid Tower',
    sku: 'CASE-NZXT-H5-FLOW',
    category: 'Case',
    subcategory: '',
    brand: 'NZXT',
    images: ['https://via.placeholder.com/1200x800?text=NZXT+H5+Flow'],
    price: 2390000,
    salePrice: 2190000,
    countInStock: 27,
    specs: [
      { key: 'Form Factor Support', value: 'ATX, mATX, Mini-ITX' },
      { key: 'Front Panel', value: 'High Airflow Mesh' },
      { key: 'Included Fans', value: '2' },
    ],
    description:
      'Airflow-oriented chassis with clean cable management and modern minimalist styling.',
    isFeatured: false,
  },
  {
    name: 'DeepCool AK620 Dual Tower Air Cooler',
    sku: 'COOLER-DEEPCOOL-AK620',
    category: 'Cooler',
    subcategory: '',
    brand: 'DeepCool',
    images: ['https://via.placeholder.com/1200x800?text=DeepCool+AK620'],
    price: 1690000,
    salePrice: null,
    countInStock: 50,
    specs: [
      { key: 'Type', value: 'Dual Tower Air Cooler' },
      { key: 'Fan Size', value: '2 x 120mm' },
      { key: 'Height', value: '160mm' },
    ],
    description:
      'High-capacity air cooler capable of handling modern high-power desktop processors.',
    isFeatured: false,
  },
  {
    name: 'LG UltraGear 27GP850-B 27 Inch 165Hz',
    sku: 'MONITOR-LG-27GP850B-165HZ',
    category: 'Monitor',
    subcategory: '',
    brand: 'LG',
    images: ['https://via.placeholder.com/1200x800?text=LG+UltraGear+27GP850-B'],
    price: 8990000,
    salePrice: 8490000,
    countInStock: 22,
    specs: [
      { key: 'Resolution', value: '2560x1440' },
      { key: 'Refresh Rate', value: '165Hz' },
      { key: 'Panel', value: 'Nano IPS' },
    ],
    description:
      'Fast and color-accurate gaming monitor tailored for competitive and immersive play.',
    isFeatured: true,
  },
  {
    name: 'Keychron K8 Pro Mechanical Keyboard',
    sku: 'KEYBOARD-KEYCHRON-K8-PRO',
    category: 'Keyboard',
    subcategory: '',
    brand: 'Keychron',
    images: ['https://via.placeholder.com/1200x800?text=Keychron+K8+Pro'],
    price: 2790000,
    salePrice: null,
    countInStock: 34,
    specs: [
      { key: 'Layout', value: 'TKL 87-key' },
      { key: 'Connectivity', value: 'Bluetooth + USB-C' },
      { key: 'Switch Type', value: 'Hot-swappable' },
    ],
    description:
      'Versatile mechanical keyboard suitable for developers, gamers, and productivity users.',
    isFeatured: false,
  },
  {
    name: 'Logitech G Pro X Superlight 2',
    sku: 'MOUSE-LOGITECH-GPROX-SL2',
    category: 'Mouse',
    subcategory: '',
    brand: 'Logitech',
    images: ['https://via.placeholder.com/1200x800?text=Logitech+G+Pro+X+Superlight+2'],
    price: 3490000,
    salePrice: 3190000,
    countInStock: 38,
    specs: [
      { key: 'Weight', value: '60g' },
      { key: 'Sensor', value: 'HERO 2' },
      { key: 'Polling Rate', value: '2000Hz' },
    ],
    description:
      'Ultra-light wireless gaming mouse focused on precision tracking and low-latency response.',
    isFeatured: true,
  },
  {
    name: 'HyperX Cloud III Wireless Headset',
    sku: 'HEADSET-HYPERX-CLOUD-III-WL',
    category: 'Headset',
    subcategory: '',
    brand: 'HyperX',
    images: ['https://via.placeholder.com/1200x800?text=HyperX+Cloud+III+Wireless'],
    price: 3290000,
    salePrice: null,
    countInStock: 29,
    specs: [
      { key: 'Connection', value: '2.4GHz Wireless' },
      { key: 'Battery Life', value: 'Up to 120 hours' },
      { key: 'Microphone', value: 'Detachable noise-cancelling' },
    ],
    description:
      'Comfortable long-session headset with clear voice pickup and balanced in-game audio.',
    isFeatured: false,
  },
];

const destroyData = async () => {
  await Order.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});

  console.log('[seeder] Database data destroyed successfully');
};

const importData = async () => {
  await Order.deleteMany({});
  await Product.deleteMany({});
  await User.deleteMany({});

  const adminUser = await User.create(adminUserSeed);
  const createdProducts = await Product.create(productSeeds);

  console.log(
    `[seeder] Data imported successfully: 1 admin (${adminUser.email}), ${createdProducts.length} products`
  );
};

const runSeeder = async () => {
  try {
    await connectDB();

    if (process.argv.includes('-d')) {
      await destroyData();
    } else {
      await importData();
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[seeder] Seeder failed: ${error.message}`);
    await mongoose.connection.close();
    process.exit(1);
  }
};

runSeeder();
