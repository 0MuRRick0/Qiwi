import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../index.css'

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password2: ''
  });
  const [errors, setErrors] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
   
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    try {
      const result = await register(
        formData.email,
        formData.username,
        formData.password,
        formData.password2
      );

      if (result.success) {
        navigate('/login');
      } else if (result.error) {
       
        if (typeof result.error === 'object') {
          setErrors(result.error);
        } else {
          setErrors({ general: result.error });
        }
      }
    } catch (error) {
      setErrors({ general: 'Registration failed. Please try again.' });
    }
  };

  return (
    <div className="auth-page">
      <h2>Register</h2>
      
      {errors.general && <div className="error">{errors.general}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            required
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>

        <div className="form-group">
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={formData.username}
            onChange={handleChange}
            className={errors.username ? 'error' : ''}
            required
          />
          {errors.username && <span className="field-error">{errors.username}</span>}
        </div>

        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className={errors.password ? 'error' : ''}
            required
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </div>

        <div className="form-group">
          <input
            type="password"
            name="password2"
            placeholder="Repeat Password"
            value={formData.password2}
            onChange={handleChange}
            className={errors.password2 ? 'error' : ''}
            required
          />
          {errors.password2 && <span className="field-error">{errors.password2}</span>}
        </div>

        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;