import React from 'react';
import AdminOwnersList from '../../components/AdminOwnersList';

const Customers: React.FC = () => (
  <AdminOwnersList
    type="customers"
    titleAr="العملاء"
    titleEn="Customers"
    emptyTitleAr="لا يوجد عملاء"
    emptyTitleEn="No customers"
  />
);

export default Customers;
