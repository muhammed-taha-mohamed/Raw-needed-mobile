import React from 'react';
import AdminOwnersList from '../../components/AdminOwnersList';

const Suppliers: React.FC = () => (
  <AdminOwnersList
    type="suppliers"
    titleAr="الموردين"
    titleEn="Suppliers"
    emptyTitleAr="لا يوجد موردون"
    emptyTitleEn="No suppliers"
  />
);

export default Suppliers;
