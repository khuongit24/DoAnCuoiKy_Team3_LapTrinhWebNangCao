import { useEffect, useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

import './SearchBar.css';

const SearchBar = ({ initialValue = '', onSearch, placeholder = 'Tìm sản phẩm, thương hiệu...' }) => {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState(initialValue);

  useEffect(() => {
    setKeyword(initialValue);
  }, [initialValue]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedKeyword = keyword.trim();

    if (typeof onSearch === 'function') {
      onSearch(trimmedKeyword);
      return;
    }

    if (trimmedKeyword) {
      navigate(`/products?keyword=${encodeURIComponent(trimmedKeyword)}`);
      return;
    }

    navigate('/products');
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit} role="search" aria-label="Tìm kiếm sản phẩm">
      <input
        className="search-bar__input"
        type="text"
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        placeholder={placeholder}
        aria-label="Từ khóa tìm kiếm"
      />
      <button className="search-bar__button" type="submit" aria-label="Tìm kiếm">
        <FiSearch />
      </button>
    </form>
  );
};

export default SearchBar;
