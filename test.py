import numpy as np
import matplotlib.pyplot as plt

try:
    import scipy.integrate as integrate
except ModuleNotFoundError:
    print("The 'scipy' module is not installed. Please install it by running:")
    print("pip install scipy")
    exit()

# Parameters
L = 1.0
rho = 1.0
g = 9.81
m = 1.5
n = 3
h = L / n  # Element length

# Tension function
def T(x):
    return rho * g * (L - x) + m * g  # Add the missing multiplication operator *

# Shape functions and derivatives
def phi1(x):
    if 0 <= x <= 1/3:
        return 3 * x
    elif 1/3 < x <= 2/3:
        return 2 - 3 * x
    return 0

def phi2(x):
    if 1/3 <= x <= 2/3:
        return 3 * x - 1
    elif 2/3 < x <= 1:
        return 3 * (1 - x)
    return 0

def phi3(x):
    if 2/3 <= x <= 1:
        return 3 * x - 2
    return 0

def dphi1_dx(x):
    if 0 <= x <= 1/3:
        return 3
    elif 1/3 < x <= 2/3:
        return -3
    return 0

def dphi2_dx(x):
    if 1/3 <= x <= 2/3:
        return 3
    elif 2/3 < x <= 1:
        return -3
    return 0

def dphi3_dx(x):
    if 2/3 <= x <= 1:
        return 3
    return 0

# Mass and stiffness matrices
M = np.zeros((3, 3))
M[0,0] = 2/9
M[0,1] = 1/18
M[1,0] = 1/18
M[1,1] = 2/9
M[1,2] = 1/18
M[2,1] = 1/18
M[2,2] = 1/9 + m

K = np.zeros((3, 3))
for i in range(3):
    for j in range(3):
        integrand = lambda x: T(x) * globals()[f'dphi{i+1}_dx'](x) * globals()[f'dphi{j+1}_dx'](x)
        K[i,j] = integrate.quad(integrand, 0, L)[0]

# Eigenvalue problem
evals, evecs = np.linalg.eig(np.linalg.inv(M) @ K)
omegas = np.sqrt(evals)

# Initial condition projection
def y0(x):
    return 0.1 * (x - 2 * x**3)

d0 = np.zeros(3)
for i in range(3):
    integrand = lambda x: y0(x) * globals()[f'phi{i+1}'](x)
    d0[i] = integrate.quad(integrand, 0, L)[0]

c = np.linalg.solve(evecs, d0)

# Time solution
t = np.linspace(0, 10, 500)
y_L2 = np.zeros_like(t)  # y(L/2, t)
y_L = np.zeros_like(t)   # y(L, t)

for idx, ti in enumerate(t):
    for i in range(3):
        y_L2[idx] += (c[i] * evecs[0,i] * phi1(0.5) + c[i] * evecs[1,i] * phi2(0.5) + c[i] * evecs[2,i] * phi3(0.5)) * np.cos(omegas[i] * ti)
        y_L[idx] += (c[i] * evecs[2,i] * phi3(1.0)) * np.cos(omegas[i] * ti)

# Plotting
plt.figure(figsize=(8,6))
plt.plot(t, y_L2, label='y(L/2, t)')
plt.plot(t, y_L, label='y(L, t)')
plt.xlabel('Time (s)')
plt.ylabel('Displacement (m)')
plt.legend()
plt.grid()
plt.title('Displacement vs Time (n=3)')
plt.savefig('displacement_plot_n3.png')