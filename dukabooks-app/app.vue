<template>
  <div>
    <header class="site-header">
      <div class="container">
        <div class="brand">
          DukaBooks
          <small>SME Invoice Assistant · powered by GPT Platform</small>
        </div>
        <nav class="nav">
          <NuxtLink to="/">Dashboard</NuxtLink>
          <NuxtLink to="/invoices">Invoices</NuxtLink>
          <NuxtLink to="/inventory">Inventory</NuxtLink>
          <NuxtLink to="/customers">Customers</NuxtLink>
          <NuxtLink to="/deals">Deals</NuxtLink>
          <NuxtLink to="/reminders">Reminders</NuxtLink>
          <NuxtLink to="/appointments">Appointments</NuxtLink>
          <NuxtLink to="/upload">Scan</NuxtLink>
          <NuxtLink to="/ask">Ask AI</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="container">
      <NuxtPage />
    </main>
  </div>
</template>
