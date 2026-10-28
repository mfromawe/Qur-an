CXX ?= clang++
CXXFLAGS = -O3 -std=c++17 -Wall -Wextra -fPIC -pthread

UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Darwin)
    TARGET = libquran_core.dylib
    LDFLAGS = -shared -dynamiclib
else
    TARGET = libquran_core.so
    LDFLAGS = -shared
endif

all: $(TARGET)

$(TARGET): quran_core.cpp quran_core.hpp
	$(CXX) $(CXXFLAGS) $(LDFLAGS) -o $@ quran_core.cpp

clean:
	rm -f $(TARGET) *.o

.PHONY: all clean
