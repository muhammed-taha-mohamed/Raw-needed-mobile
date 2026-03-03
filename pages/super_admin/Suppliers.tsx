import React from 'react';
import AdminOwnersList from '../../components/AdminOwnersList';

const Suppliers: React.FC = () => (
  <AdminOwnersList
    type="suppliers"
    titleAr="الموزعين"
    titleEn="Distributors"
    emptyTitleAr="لا يوجد موزعون"
    emptyTitleEn="No distributors"
  />
);

export default Suppliers;
